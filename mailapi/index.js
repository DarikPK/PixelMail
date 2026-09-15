const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const crypto = require("crypto");

admin.initializeApp();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://pixel-mail-a78f6.web.app",
  "https://pixel-mail-a78f6.firebaseapp.com",
  "https://mail.pixel.com.pe"
];

function applyCors(req, res, methods) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      const fields = {};
      const files = [];

      busboy.on("field", (fieldname, val) => {
        fields[fieldname] = val;
      });

      busboy.on("file", (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;
        const chunks = [];

        file.on("data", (chunk) => {
          chunks.push(chunk);
        });

        file.on("end", () => {
          const buffer = Buffer.concat(chunks);
          files.push({
            fieldname,
            originalname: filename || "adjunto",
            encoding,
            mimetype: mimeType || "application/octet-stream",
            buffer,
            size: buffer.length,
          });
        });
      });

      busboy.on("finish", () => resolve({ fields, files }));
      busboy.on("error", reject);

      if (req.rawBody) {
        busboy.end(req.rawBody);
      } else {
        req.pipe(busboy);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function normalizeAddress(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeAttachmentList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  if (value === undefined || value === null) return "";
  return String(value);
}

async function verifyFirebaseUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.slice("Bearer ".length);
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

async function resolveUserId(toEmail) {
  if (!toEmail) return null;

  try {
    const userRecord = await admin.auth().getUserByEmail(toEmail);
    return userRecord.uid;
  } catch {
    const prefix = toEmail.split("@")[0].toLowerCase();

    try {
      const listUsersResult = await admin.auth().listUsers();
      for (const userRecord of listUsersResult.users) {
        if (!userRecord.email) continue;
        const userPrefix = userRecord.email.split("@")[0].toLowerCase();
        if (
          userPrefix === prefix ||
          userPrefix.startsWith(prefix) ||
          prefix.startsWith(userPrefix)
        ) {
          return userRecord.uid;
        }
      }
    } catch (listError) {
      logger.error("[RESEND INBOUND] Error al listar usuarios", listError);
    }
  }

  // Se conserva el comportamiento histórico de Pixel Mail para no perder correos
  // cuando existe una única cuenta y el alias entrante no coincide exactamente.
  try {
    const listUsersResult = await admin.auth().listUsers(1);
    if (listUsersResult.users.length > 0) {
      return listUsersResult.users[0].uid;
    }
  } catch (error) {
    logger.error("[RESEND INBOUND] Fallback para listar usuarios fallido", error);
  }

  return null;
}

async function sendNotificationToUser(userId, payload) {
  if (!userId) return;

  try {
    const userSnap = await admin.firestore().collection("users").doc(userId).get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const notifPrefs = userData?.notifications || {
      enabled: true,
      inboundEmail: true,
      outboundSuccess: false,
      outboundError: true,
      sound: true,
      vibration: true,
      showSender: true,
      showSubject: true
    };

    if (!notifPrefs.enabled) return;

    const type = payload.data?.type;
    if (type === "inbound_email" && !notifPrefs.inboundEmail) return;
    if (type === "outbound_success" && !notifPrefs.outboundSuccess) return;
    if (type === "outbound_error" && !notifPrefs.outboundError) return;

    let displayTitle = payload.title;
    let displayBody = payload.body;

    if (type === "inbound_email") {
      const sender = payload.data?.senderName || "Alguien";
      const subject = payload.data?.subject || "(Sin asunto)";

      if (!notifPrefs.showSender && !notifPrefs.showSubject) {
        displayBody = "Nuevo correo recibido. Abre Pixel Mail para verlo.";
      } else if (!notifPrefs.showSender) {
        displayBody = `Correo recibido sobre:\n${subject}`;
      } else if (!notifPrefs.showSubject) {
        displayBody = `Nuevo correo de ${sender}.`;
      }
    } else if (type === "outbound_error" && !notifPrefs.showSubject) {
      displayBody = "No se pudo enviar un correo. Abre Pixel Mail para revisarlo.";
    }

    const devicesSnap = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("devices")
      .where("active", "==", true)
      .get();

    if (devicesSnap.empty) return;

    const tokens = [];
    const deviceDocs = [];
    devicesSnap.forEach((snapshotDoc) => {
      const device = snapshotDoc.data();
      if (device.token) {
        tokens.push(device.token);
        deviceDocs.push({ id: snapshotDoc.id, token: device.token });
      }
    });

    if (tokens.length === 0) return;

    const fcmMessage = {
      tokens,
      data: {
        title: displayTitle,
        body: displayBody,
        ...(payload.data || {})
      }
    };

    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    if (response.failureCount > 0) {
      const batch = admin.firestore().batch();
      let hasUpdates = false;

      response.responses.forEach((result, index) => {
        if (result.success) return;

        const error = result.error;
        const device = deviceDocs[index];
        logger.warn(`[FCM] Fallo en token para dispositivo ${device.id}:`, error?.code);

        if (
          error?.code === "messaging/invalid-registration-token" ||
          error?.code === "messaging/registration-token-not-registered"
        ) {
          const deviceRef = admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("devices")
            .doc(device.id);
          batch.update(deviceRef, { active: false, notificationsEnabled: false });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        await batch.commit();
      }
    }
  } catch (error) {
    logger.error("[FCM] Error general en el servicio de notificaciones", error);
  }
}

exports.sendEmail = onRequest({ secrets: ["RESEND_API_KEY"] }, async (req, res) => {
  applyCors(req, res, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decodedToken = await verifyFirebaseUser(req);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = decodedToken.uid;
  const userEmail = decodedToken.email || "david.lachira@pixel.com.pe";

  let to;
  let subject;
  let html;
  let text;
  let cc;
  let bcc;
  let emailId;
  let uploadedFiles = [];
  let inlineMetadata = [];

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const parsed = await parseMultipart(req);
      to = parsed.fields.to;
      subject = parsed.fields.subject;
      html = parsed.fields.html;
      text = parsed.fields.text;
      cc = parsed.fields.cc;
      bcc = parsed.fields.bcc;
      emailId = parsed.fields.emailId;
      uploadedFiles = parsed.files || [];

      if (parsed.fields.inlineMetadata) {
        try {
          const parsedMetadata = JSON.parse(parsed.fields.inlineMetadata);
          inlineMetadata = Array.isArray(parsedMetadata) ? parsedMetadata : [];
        } catch (error) {
          logger.warn("[RESEND] inlineMetadata inválido; se enviará sin metadatos inline", error);
        }
      }
    } catch (error) {
      logger.error("[BUSBOY] Error procesando multipart", error);
      return res.status(400).json({ error: `Error parsing form-data: ${error.message}` });
    }
  } else {
    ({ to, subject, html, text, cc, bcc, emailId } = req.body || {});
  }

  const recipients = normalizeAddress(to);
  const ccRecipients = normalizeAddress(cc);
  const bccRecipients = normalizeAddress(bcc);

  if (recipients.length === 0 || !subject || !html) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const isNewEmail = !emailId;
  let docRef;

  if (emailId) {
    docRef = admin.firestore().collection("emails").doc(emailId);
  } else {
    docRef = admin.firestore().collection("emails").doc();
    emailId = docRef.id;
  }

  const attachmentsMetadata = uploadedFiles.map((file) => {
    const meta = inlineMetadata.find((item) => item?.filename === file.originalname);
    return {
      name: file.originalname,
      size: file.size,
      contentType: file.mimetype,
      ...(meta ? {
        contentDisposition: meta.disposition || null,
        contentId: meta.contentId || null
      } : {})
    };
  });

  const emailPayloadDoc = {
    userId,
    from: userEmail,
    to: recipients,
    cc: ccRecipients,
    bcc: bccRecipients,
    subject,
    body: html,
    html,
    text: text || "",
    status: "sending",
    attachments: attachmentsMetadata,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    direction: "outbound"
  };

  if (isNewEmail) {
    emailPayloadDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  try {
    await docRef.set(emailPayloadDoc, { merge: true });
  } catch (error) {
    // El correo aún puede enviarse aunque Firestore tenga un fallo transitorio.
    logger.error("[DB] No se pudo guardar el estado inicial del envío", error);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const resendPayload = {
    from: `Pixel Mail <${userEmail}>`,
    to: recipients,
    subject,
    html,
    replyTo: userEmail
  };

  if (text) resendPayload.text = text;
  if (ccRecipients.length > 0) resendPayload.cc = ccRecipients;
  if (bccRecipients.length > 0) resendPayload.bcc = bccRecipients;

  if (uploadedFiles.length > 0) {
    resendPayload.attachments = uploadedFiles.map((file) => {
      const meta = inlineMetadata.find((item) => item?.filename === file.originalname);
      const attachment = {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      };

      if (meta?.contentId) {
        attachment.contentId = meta.contentId;
      }
      return attachment;
    });
  }

  let providerData;
  try {
    const { data, error } = await resend.emails.send(resendPayload);
    if (error) {
      throw new Error(error.message || "Error de Resend");
    }
    if (!data?.id) {
      throw new Error("Resend no devolvió un identificador de envío");
    }
    providerData = data;
  } catch (error) {
    logger.error("[RESEND] Falló el envío", error);

    try {
      await docRef.set({
        status: "failed",
        lastErrorCode: "RESEND_ERROR",
        lastErrorMessage: error.message || "Error al enviar el correo",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (dbError) {
      logger.error("[DB] Tampoco se pudo guardar el estado failed", dbError);
    }

    void sendNotificationToUser(userId, {
      title: "No se pudo enviar el correo",
      body: `Mensaje para ${recipients.join(", ")}\nToca para revisar y volver a intentar.`,
      data: {
        type: "outbound_error",
        emailId,
        userId,
        recipient: recipients.join(", "),
        subject,
        route: `/redactar?replyTo=${emailId}`
      }
    });

    return res.status(500).json({ error: error.message || "Error al procesar el envío" });
  }

  // Un fallo de Firestore después de que Resend aceptó el mensaje no debe hacer que
  // el frontend crea que el correo no salió y lo reenvíe duplicado.
  try {
    await docRef.set({
      status: "sent",
      providerMessageId: providerData.id,
      resendEmailId: providerData.id,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    logger.error("[DB] Resend confirmó el envío, pero no se pudo actualizar Firestore", error);
  }

  void sendNotificationToUser(userId, {
    title: "Correo enviado",
    body: `Enviado a ${recipients.join(", ")}\nAsunto: ${subject}`,
    data: {
      type: "outbound_success",
      emailId,
      userId,
      recipient: recipients.join(", "),
      subject,
      route: "/enviados"
    }
  });

  return res.status(200).json({
    success: true,
    id: providerData.id,
    emailId
  });
});

exports.resendInboundWebhook = onRequest({
  region: "us-central1",
  secrets: ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "RESEND_RECEIVING_API_KEY"]
}, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const svixId = req.headers["svix-id"] || req.headers["Svix-Id"];
  const svixTimestamp = req.headers["svix-timestamp"] || req.headers["Svix-Timestamp"];
  const svixSignature = req.headers["svix-signature"] || req.headers["Svix-Signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";
  let isValid = false;

  try {
    let secretKey = secret.trim();
    if (secretKey.startsWith("whsec_")) {
      secretKey = secretKey.substring(6);
    }

    const secretBuffer = Buffer.from(secretKey, "base64");
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const hmac = crypto.createHmac("sha256", secretBuffer);
    hmac.update(toSign);
    const computedSignature = hmac.digest("base64");

    for (const part of svixSignature.split(" ")) {
      const pair = part.split(",");
      if (pair.length === 2 && pair[0] === "v1" && pair[1] === computedSignature) {
        isValid = true;
        break;
      }
    }
  } catch (error) {
    logger.error("[WEBHOOK] Error verificando firma", error);
  }

  if (!isValid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const verifiedEvent = req.body || {};
  if (verifiedEvent.type !== "email.received") {
    return res.status(200).json({ success: true, ignored: true });
  }

  const emailId =
    verifiedEvent?.data?.email_id ||
    verifiedEvent?.email_id ||
    verifiedEvent?.data?.id;

  if (!emailId) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const docRef = admin.firestore().collection("emails").doc(emailId);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return res.status(200).json({ success: true, duplicated: true });
  }

  const receivingApiKey = process.env.RESEND_RECEIVING_API_KEY;
  if (!receivingApiKey) {
    return res.status(500).json({ error: "Configuration Error" });
  }

  const receivingResend = new Resend(receivingApiKey);
  let emailContent;

  try {
    const { data, error } = await receivingResend.emails.receiving.get(emailId);
    if (error) throw new Error(error.message);
    emailContent = data;
  } catch (error) {
    logger.error("[RESEND INBOUND] No se pudo obtener el contenido", error);
    return res.status(500).json({ error: error.message });
  }

  if (!emailContent) {
    return res.status(502).json({ error: "Received email content unavailable" });
  }

  const from = emailContent.from || "";
  const to = emailContent.to || [];
  const cc = emailContent.cc || [];
  const bcc = emailContent.bcc || [];
  const subject = emailContent.subject || "";
  const html = emailContent.html || "";
  const text = emailContent.text || "";
  const headers = emailContent.headers || {};
  const rawAttachments = Array.isArray(emailContent.attachments) ? emailContent.attachments : [];
  const createdAtString = emailContent.created_at || new Date().toISOString();

  let fromName = "";
  let fromEmail = from;
  const fromMatch = from.match(/^(.*?)\s*<(.*?)>$/);
  if (fromMatch) {
    fromName = fromMatch[1].trim().replace(/^["']|["']$/g, "");
    fromEmail = fromMatch[2].trim();
  }

  const normalizedTo = normalizeAddress(to);
  const normalizedCc = normalizeAddress(cc);
  const normalizedBcc = normalizeAddress(bcc);

  // La ficha del correo recibido no siempre incluye tamaño. La API de adjuntos sí,
  // por eso enriquecemos los metadatos una vez al recibir el mensaje.
  let attachmentDetails = [];
  if (rawAttachments.length > 0) {
    try {
      const { data, error } = await receivingResend.emails.receiving.attachments.list({ emailId });
      if (error) throw new Error(error.message);
      attachmentDetails = normalizeAttachmentList(data);
    } catch (error) {
      logger.warn("[RESEND INBOUND] No se pudieron enriquecer los adjuntos; se usará metadata básica", error);
    }
  }

  const attachmentSource = attachmentDetails.length > 0 ? attachmentDetails : rawAttachments;
  const attachmentsMeta = attachmentSource.map((attachment) => ({
    id: attachment.id || attachment.filename,
    name: attachment.filename || "Adjunto",
    size: Number.isFinite(attachment.size) ? attachment.size : 0,
    contentType: attachment.content_type || "",
    contentDisposition: attachment.content_disposition || null,
    contentId: attachment.content_id || null
  }));

  const targetEmail = normalizedTo[0] || "";
  const userId = await resolveUserId(targetEmail);
  const parsedReceivedAt = new Date(createdAtString);
  const receivedAt = Number.isNaN(parsedReceivedAt.getTime()) ? new Date() : parsedReceivedAt;

  const emailDoc = {
    userId,
    resendEmailId: emailId,
    messageId: headers["message-id"] || emailContent.message_id || emailId,
    from,
    fromName,
    fromEmail,
    to: normalizedTo,
    cc: normalizedCc,
    bcc: normalizedBcc,
    subject: subject || "(Sin asunto)",
    text,
    html,
    body: html,
    headers,
    attachments: attachmentsMeta,
    receivedAt: admin.firestore.Timestamp.fromDate(receivedAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    direction: "inbound",
    status: "received",
    read: false,
    starred: false,
    archived: false,
    deleted: false
  };

  try {
    await docRef.set(emailDoc);
  } catch (error) {
    logger.error("[RESEND INBOUND] No se pudo guardar el correo", error);
    return res.status(500).json({ error: "Failed to save email" });
  }

  void sendNotificationToUser(userId, {
    title: "Nuevo correo",
    body: `${fromName || fromEmail}\n${subject}`,
    data: {
      type: "inbound_email",
      emailId,
      userId: userId || "",
      senderName: fromName || fromEmail,
      senderEmail: fromEmail,
      subject,
      route: `/recibidos?open=${emailId}`
    }
  });

  return res.status(200).json({ success: true, id: emailId });
});

exports.sendTestPush = onRequest({ region: "us-central1" }, async (req, res) => {
  applyCors(req, res, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decodedToken = await verifyFirebaseUser(req);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: "Missing registration token" });
  }

  try {
    const response = await admin.messaging().send({
      token,
      data: {
        title: "¡Notificación de prueba exitosa!",
        body: "Felicidades, las notificaciones push de Pixel Mail están configuradas correctamente.",
        type: "test_notification"
      }
    });
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    logger.error("[FCM TEST] Falló el push de prueba", error);
    return res.status(500).json({ error: error.message });
  }
});

exports.getAttachment = onRequest({
  region: "us-central1",
  secrets: ["RESEND_RECEIVING_API_KEY"]
}, async (req, res) => {
  applyCors(req, res, "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decodedToken = await verifyFirebaseUser(req);
  if (!decodedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const emailId = firstQueryValue(req.query.emailId);
  const filename = firstQueryValue(req.query.filename);
  const attachmentId = firstQueryValue(req.query.attachmentId);

  if (!emailId || (!filename && !attachmentId)) {
    return res.status(400).json({ error: "Missing emailId and attachment identifier" });
  }

  const receivingApiKey = process.env.RESEND_RECEIVING_API_KEY;
  if (!receivingApiKey) {
    return res.status(500).json({ error: "Configuration Error" });
  }

  try {
    const resend = new Resend(receivingApiKey);
    let attachment;

    if (attachmentId) {
      const { data, error } = await resend.emails.receiving.attachments.get({
        id: attachmentId,
        emailId
      });
      if (error) throw new Error(error.message);
      attachment = data;
    } else {
      const { data, error } = await resend.emails.receiving.attachments.list({ emailId });
      if (error) throw new Error(error.message);
      const attachments = normalizeAttachmentList(data);
      attachment = attachments.find((item) => item.filename === filename);
    }

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const downloadUrl = attachment.download_url || attachment.downloadUrl;
    if (!downloadUrl) {
      return res.status(404).json({ error: "Attachment content not available" });
    }

    const downloadResponse = await fetch(downloadUrl);
    if (!downloadResponse.ok) {
      logger.warn(`[RESEND ATTACHMENT] CDN respondió ${downloadResponse.status}`);
      return res.status(502).json({ error: "Attachment download failed" });
    }

    const buffer = Buffer.from(await downloadResponse.arrayBuffer());
    const actualFilename = attachment.filename || filename || "adjunto";
    const asciiFilename = actualFilename
      .replace(/[\r\n"]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_");

    res.setHeader(
      "Content-Type",
      attachment.content_type || downloadResponse.headers.get("content-type") || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(actualFilename)}`
    );
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(buffer);
  } catch (error) {
    logger.error("[RESEND ATTACHMENT] Error obteniendo adjunto", error);
    return res.status(500).json({ error: error.message });
  }
});
