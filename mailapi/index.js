const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const crypto = require("crypto");

admin.initializeApp();

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
            originalname: filename,
            encoding,
            mimetype: mimeType,
            buffer,
            size: buffer.length,
          });
        });
      });

      busboy.on("finish", () => {
        resolve({ fields, files });
      });

      busboy.on("error", (err) => {
        reject(err);
      });

      if (req.rawBody) {
        busboy.end(req.rawBody);
      } else {
        req.pipe(busboy);
      }
    } catch (err) {
      reject(err);
    }
  });
}

async function resolveUserId(toEmail) {
  try {
    const userRecord = await admin.auth().getUserByEmail(toEmail);
    return userRecord.uid;
  } catch (error) {
    // Si la coincidencia exacta falla, intentamos coincidencia por prefijo
    const prefix = toEmail.split('@')[0].toLowerCase();
    try {
      const listUsersResult = await admin.auth().listUsers();
      for (const userRecord of listUsersResult.users) {
        if (userRecord.email) {
          const userPrefix = userRecord.email.split('@')[0].toLowerCase();
          if (userPrefix === prefix || userPrefix.startsWith(prefix) || prefix.startsWith(userPrefix)) {
            return userRecord.uid;
          }
        }
      }
    } catch (listError) {
      logger.error("[RESEND INBOUND] Error al listar usuarios", listError);
    }
  }
  // Alternativa por defecto: asignar al primer usuario que encontremos en Auth
  try {
    const listUsersResult = await admin.auth().listUsers(1);
    if (listUsersResult.users.length > 0) {
      return listUsersResult.users[0].uid;
    }
  } catch (e) {
    logger.error("[RESEND INBOUND] Fallback para listar usuarios fallido", e);
  }
  return null;
}

// Servicio centralizado de envío de notificaciones push de Firebase (FCM)
async function sendNotificationToUser(userId, payload) {
  if (!userId) return;

  try {
    // 1. Consultar preferencias de notificaciones del usuario
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

    // Si están desactivadas globalmente, no enviar nada
    if (!notifPrefs.enabled) {
      logger.log(`[FCM] Notificaciones desactivadas globalmente para el usuario ${userId}`);
      return;
    }

    // Filtrar por categorías específicas según el tipo de payload
    const type = payload.data?.type;
    if (type === 'inbound_email' && !notifPrefs.inboundEmail) return;
    if (type === 'outbound_success' && !notifPrefs.outboundSuccess) return;
    if (type === 'outbound_error' && !notifPrefs.outboundError) return;

    // 2. Aplicar preferencias de privacidad en la pantalla bloqueada
    let displayTitle = payload.title;
    let displayBody = payload.body;

    if (type === 'inbound_email') {
      const sender = payload.data?.senderName || 'Alguien';
      const subject = payload.data?.subject || '(Sin asunto)';

      if (!notifPrefs.showSender && !notifPrefs.showSubject) {
        displayBody = "Nuevo correo recibido. Abre Pixel Mail para verlo.";
      } else if (!notifPrefs.showSender) {
        displayBody = `Correo recibido sobre:\n${subject}`;
      } else if (!notifPrefs.showSubject) {
        displayBody = `Nuevo correo de ${sender}.`;
      }
    } else if (type === 'outbound_error') {
      if (!notifPrefs.showSubject) {
        displayBody = "No se pudo enviar un correo. Abre Pixel Mail para revisarlo.";
      }
    }

    // 3. Consultar dispositivos activos del usuario
    const devicesSnap = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("devices")
      .where("active", "==", true)
      .get();

    if (devicesSnap.empty) {
      logger.log(`[FCM] No se encontraron dispositivos activos para el usuario ${userId}`);
      return;
    }

    const tokens = [];
    const deviceDocs = [];
    devicesSnap.forEach(doc => {
      const dev = doc.data();
      if (dev.token) {
        tokens.push(dev.token);
        deviceDocs.push({ id: doc.id, token: dev.token });
      }
    });

    if (tokens.length === 0) return;

    // 4. Enviar notificación push multicast usando Firebase Admin Messaging
    const fcmMessage = {
      tokens,
      notification: {
        title: displayTitle,
        body: displayBody
      },
      data: payload.data || {}
    };

    logger.log(`[FCM] Enviando mensaje multicast a ${tokens.length} dispositivos para el usuario ${userId}`);
    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    // 5. Manejar y depurar tokens caídos o inválidos de forma auto-curativa
    if (response.failureCount > 0) {
      const batch = admin.firestore().batch();
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const err = res.error;
          const devInfo = deviceDocs[idx];
          logger.error(`[FCM] Fallo en token para dispositivo ${devInfo.id}:`, err.code);

          // Si el token es inválido o ya no está registrado, lo desactivamos lógicamente
          if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            const devRef = admin.firestore()
              .collection("users")
              .doc(userId)
              .collection("devices")
              .doc(devInfo.id);
            batch.update(devRef, { active: false, notificationsEnabled: false });
          }
        }
      });
      await batch.commit();
      logger.log(`[FCM] Limpieza de tokens inválidos completada para el usuario ${userId}`);
    }

  } catch (e) {
    logger.error("[FCM] Error general en el servicio de notificaciones:", e);
  }
}

exports.sendEmail = onRequest({ secrets: ["RESEND_API_KEY"] }, async (req, res) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://pixel-mail-a78f6.web.app",
    "https://pixel-mail-a78f6.firebaseapp.com",
    "https://mail.pixel.com.pe"
  ];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    logger.log("[CORS] origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
    logger.log("[AUTH] token verified", decodedToken.email);
  } catch (error) {
    logger.error("[AUTH] error", error);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = decodedToken.uid;
  const userEmail = decodedToken.email || "david.lachira@pixel.com.pe";

  let to, subject, html, cc, bcc, emailId;
  let uploadedFiles = [];

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const parsed = await parseMultipart(req);
      to = parsed.fields.to;
      subject = parsed.fields.subject;
      html = parsed.fields.html;
      cc = parsed.fields.cc;
      bcc = parsed.fields.bcc;
      emailId = parsed.fields.emailId;
      uploadedFiles = parsed.files || [];
    } catch (parseError) {
      logger.error("[BUSBOY] parsing error", parseError);
      return res.status(400).json({ error: "Error parsing form-data: " + parseError.message });
    }
  } else {
    ({ to, subject, html, cc, bcc, emailId } = req.body || {});
  }

  if (!to || !subject || !html) {
    return res.status(400).json({
      error: "Missing parameters"
    });
  }

  // 1. Guardar o actualizar estado en Firestore como "sending"
  let docRef;
  if (emailId) {
    docRef = admin.firestore().collection("emails").doc(emailId);
  } else {
    docRef = admin.firestore().collection("emails").doc();
    emailId = docRef.id;
  }

  const emailPayloadDoc = {
    userId,
    from: userEmail,
    to: [to],
    cc: cc ? (Array.isArray(cc) ? cc : cc.split(",").map(e => e.trim()).filter(Boolean)) : [],
    bcc: bcc ? (Array.isArray(bcc) ? bcc : bcc.split(",").map(e => e.trim()).filter(Boolean)) : [],
    subject,
    body: html,
    status: "sending",
    attachments: uploadedFiles.map(f => ({ name: f.originalname, size: f.size })),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    direction: "outbound"
  };

  if (!emailId) {
    emailPayloadDoc.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  try {
    await docRef.set(emailPayloadDoc, { merge: true });
  } catch (dbErr) {
    logger.error("[DB ERROR] Error salvando estado de envío inicial", dbErr);
  }

  // 2. Enviar usando Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const emailPayload = {
      from: `Pixel Mail <${userEmail}>`,
      to: [to],
      subject: subject,
      html: html,
      reply_to: userEmail
    };

    if (cc) {
      emailPayload.cc = Array.isArray(cc) ? cc : cc.split(",").map(e => e.trim()).filter(Boolean);
    }
    if (bcc) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : bcc.split(",").map(e => e.trim()).filter(Boolean);
    }

    if (uploadedFiles.length > 0) {
      emailPayload.attachments = uploadedFiles.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      }));
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      throw new Error(error.message || "Error de Resend");
    }

    // 3. Flujo exitoso: actualizar Firestore a "sent" y notificar push
    await docRef.update({
      status: "sent",
      providerMessageId: data.id,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Enviar notificación push de envío exitoso de forma asíncrona
    sendNotificationToUser(userId, {
      title: "Correo enviado",
      body: `Enviado a ${to}\nAsunto: ${subject}`,
      data: {
        type: "outbound_success",
        emailId: emailId,
        userId: userId,
        recipient: to,
        subject: subject,
        route: `/enviados`
      }
    });

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    logger.error("[RESEND FAIL]", error);

    // 4. Flujo con error: actualizar Firestore a "failed" y notificar push
    await docRef.update({
      status: "failed",
      lastErrorCode: "RESEND_ERROR",
      lastErrorMessage: error.message || "Error al enviar el correo",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Enviar notificación push de error de forma asíncrona (con requireInteraction para llamar la atención del usuario)
    sendNotificationToUser(userId, {
      title: "No se pudo enviar el correo",
      body: `Mensaje para ${to}\nToca para revisar y volver a intentar.`,
      data: {
        type: "outbound_error",
        emailId: emailId,
        userId: userId,
        recipient: to,
        subject: subject,
        route: `/redactar?replyTo=${emailId}`
      }
    });

    return res.status(500).json({ error: error.message || "Error al procesar el envío" });
  }
});

exports.resendInboundWebhook = onRequest({ region: "us-central1", secrets: ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "RESEND_RECEIVING_API_KEY"] }, async (req, res) => {
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

    const parts = svixSignature.split(" ");
    for (const part of parts) {
      const kv = part.split(",");
      if (kv.length === 2 && kv[0] === "v1") {
        if (kv[1] === computedSignature) {
          isValid = true;
          break;
        }
      }
    }
  } catch (verifyError) {
    logger.error("[WEBHOOK SIGNATURE ERROR]", verifyError);
  }

  if (!isValid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const verifiedEvent = req.body || {};
  const eventType = verifiedEvent.type;

  if (eventType !== "email.received") {
    return res.status(200).json({ success: true, ignored: true });
  }

  const emailId =
    verifiedEvent?.data?.email_id ||
    verifiedEvent?.email_id ||
    verifiedEvent?.data?.id;

  if (!emailId) {
    return res.status(400).json({ error: "Bad Request" });
  }

  // Idempotencia
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
    if (error) {
      throw new Error(error.message);
    }
    emailContent = data;
  } catch (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const from = emailContent.from || "";
  const to = emailContent.to || [];
  const cc = emailContent.cc || [];
  const bcc = emailContent.bcc || [];
  const subject = emailContent.subject || "";
  const html = emailContent.html || "";
  const text = emailContent.text || "";
  const headers = emailContent.headers || {};
  const rawAttachments = emailContent.attachments || [];
  const createdAtString = emailContent.created_at || new Date().toISOString();

  let fromName = "";
  let fromEmail = from;
  const match = from.match(/^(.*?)\s*<(.*?)>$/);
  if (match) {
    fromName = match[1].trim().replace(/^["']|["']$/g, "");
    fromEmail = match[2].trim();
  }

  const normalizeAddress = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => v.trim());
    if (typeof val === "string") return val.split(",").map(v => v.trim()).filter(Boolean);
    return [];
  };

  const normalizedTo = normalizeAddress(to);
  const normalizedCc = normalizeAddress(cc);
  const normalizedBcc = normalizeAddress(bcc);

  const attachmentsMeta = rawAttachments.map(att => ({
    id: att.id || att.filename,
    name: att.filename,
    size: att.size || 0,
    contentType: att.content_type || "",
    contentDisposition: att.content_disposition || "",
    contentId: att.content_id || ""
  }));

  const targetEmail = normalizedTo[0] || "";
  const userId = await resolveUserId(targetEmail);

  const emailDoc = {
    userId,
    resendEmailId: emailId,
    messageId: headers["message-id"] || emailId,
    from,
    fromName,
    fromEmail,
    to: normalizedTo,
    cc: normalizedCc,
    bcc: normalizedBcc,
    subject: subject || "(Sin asunto)",
    text: text || "",
    html: html || "",
    headers: headers,
    attachments: attachmentsMeta,
    receivedAt: admin.firestore.Timestamp.fromDate(new Date(createdAtString)),
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

    // Disparar la notificación push del correo recibido de forma asíncrona
    sendNotificationToUser(userId, {
      title: "Nuevo correo",
      body: `${fromName || fromEmail}\n${subject}`,
      data: {
        type: "inbound_email",
        emailId: emailId,
        userId: userId,
        senderName: fromName || fromEmail,
        senderEmail: fromEmail,
        subject: subject,
        route: `/recibidos?open=${emailId}`
      }
    });

    return res.status(200).json({ success: true, id: emailId });
  } catch (saveError) {
    return res.status(500).json({ error: "Failed to save email" });
  }
});

// Endpoint seguro para enviar notificaciones de prueba
exports.sendTestPush = onRequest({ region: "us-central1" }, async (req, res) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://pixel-mail-a78f6.web.app",
    "https://pixel-mail-a78f6.firebaseapp.com",
    "https://mail.pixel.com.pe"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: "Missing registration token" });
  }

  try {
    const message = {
      token,
      notification: {
        title: "¡Notificación de prueba exitosa!",
        body: "Felicidades, las notificaciones push de Pixel Mail están configuradas correctamente."
      },
      data: {
        type: "test_notification"
      }
    };

    logger.log("[FCM TEST] Enviando push de prueba...");
    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (e) {
    logger.error("[FCM TEST FAIL]", e);
    return res.status(500).json({ error: e.message });
  }
});

exports.getAttachment = onRequest({ region: "us-central1", secrets: ["RESEND_API_KEY"] }, async (req, res) => {
  const allowedOrigins = [
    "http://localhost:5173",
    "https://pixel-mail-a78f6.web.app",
    "https://pixel-mail-a78f6.firebaseapp.com",
    "https://mail.pixel.com.pe"
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { emailId, filename, attachmentId } = req.query;
  if (!emailId || !filename) {
    return res.status(400).json({ error: "Missing emailId or filename" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1. Obtener documento de correo de Firestore para determinar dirección y buscar ID de adjunto
    let emailDoc = null;
    let direction = "inbound"; // por defecto

    const emailQuery = await admin.firestore().collection("emails")
      .where("resendEmailId", "==", emailId)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      emailDoc = emailQuery.docs[0].data();
    } else {
      const docSnap = await admin.firestore().collection("emails").doc(emailId).get();
      if (docSnap.exists) {
        emailDoc = docSnap.data();
      }
    }

    if (emailDoc) {
      direction = emailDoc.direction || "inbound";
    }

    // 2. Determinar el ID real del adjunto en Resend
    let targetAttachmentId = attachmentId;
    if (!targetAttachmentId && emailDoc && emailDoc.attachments && Array.isArray(emailDoc.attachments)) {
      const found = emailDoc.attachments.find(att =>
        att.name === filename || (att.id && att.id === filename)
      );
      if (found) {
        targetAttachmentId = found.id;
      }
    }

    if (!targetAttachmentId) {
      targetAttachmentId = filename; // fallback por si no se encuentra ID
    }

    // 3. Recuperar metadatos y download_url firmado usando la API oficial de Resend
    let attachmentData = null;

    if (direction === "inbound") {
      try {
        const { data, error } = await resend.emails.receiving.attachments.get({
          emailId: emailId,
          id: targetAttachmentId
        });
        if (error) {
          throw new Error(error.message);
        }
        attachmentData = data;
      } catch (inboundErr) {
        logger.error("[RESEND ATTACHMENT] Error en inbound API, reintentando con outbound", inboundErr);
      }
    }

    if (!attachmentData) {
      const { data, error } = await resend.emails.attachments.get({
        emailId: emailId,
        id: targetAttachmentId
      });
      if (error) {
        throw new Error(error.message || "Error al recuperar el adjunto desde Resend");
      }
      attachmentData = data;
    }

    if (!attachmentData || !attachmentData.download_url) {
      return res.status(404).json({ error: "Attachment or download URL not found in Resend response" });
    }

    // 4. Descargar el adjunto usando el download_url oficial firmado y enviarlo al cliente
    const fetchResponse = await fetch(attachmentData.download_url);
    if (!fetchResponse.ok) {
      throw new Error(`Failed to download from Resend CDN: ${fetchResponse.statusText}`);
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', attachmentData.content_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachmentData.filename || filename}"`);
    return res.send(buffer);

  } catch (err) {
    logger.error("[RESEND ATTACHMENT] Error fetching attachment via official API", err);
    return res.status(500).json({ error: err.message });
  }
});
