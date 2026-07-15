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

  // 1. Manejar OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  // 2. Validar método
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 3. Validar autenticación
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    logger.log("[AUTH] token verified", decodedToken.email);
  } catch (error) {
    logger.error("[AUTH] error", error);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 4. Recibir parámetros
  let to, subject, html, cc, bcc;
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
      uploadedFiles = parsed.files || [];
    } catch (parseError) {
      logger.error("[BUSBOY] parsing error", parseError);
      return res.status(400).json({ error: "Error parsing form-data: " + parseError.message });
    }
  } else {
    ({ to, subject, html, cc, bcc } = req.body || {});
  }

  if (!to || !subject || !html) {
    return res.status(400).json({
      error: "Missing parameters",
      received: contentType.includes("multipart/form-data") ? "multipart" : Object.keys(req.body || {}),
      missing: {
        to: !to,
        subject: !subject,
        html: !html,
      },
    });
  }

  // 4.5 Log de diagnóstico temporal en backend (Punto 7)
  console.log("[PIXEL MAIL] Archivos recibidos", {
    count: uploadedFiles.length,
    files: uploadedFiles.map((file) => ({
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    })),
  });

  // Registrar el HTML exacto recibido en el backend
  logger.log("[CLOUD FUNCTION SENDEMAIL] HTML RECIBIDO:", html);

  // 5. Enviar usando Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    logger.log("[RESEND] sending");

    const emailPayload = {
      from: "David Lachira <david.lachira@pixel.com.pe>",
      to: [to],
      subject: subject,
      html: html, // Se envía el HTML intacto para no romper tablas ni insertar <br> entre tags
      reply_to: "david.lachira@pixel.com.pe",
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
      logger.error("[RESEND] error", error);
      return res.status(500).json({ error: error.message });
    }

    logger.log("[RESEND] success", data.id);
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    logger.error("[RESEND] error", error);
    return res.status(500).json({ error: error.message });
  }
});

exports.resendInboundWebhook = onRequest({ region: "us-central1", secrets: ["RESEND_API_KEY", "RESEND_WEBHOOK_SECRET"] }, async (req, res) => {
  // 1. Aceptar únicamente solicitudes POST
  if (req.method !== "POST") {
    logger.error("[RESEND WEBHOOK] Method Not Allowed:", req.method);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Extraer cabeceras Svix
  const svixId = req.headers["svix-id"] || req.headers["Svix-Id"];
  const svixTimestamp = req.headers["svix-timestamp"] || req.headers["Svix-Timestamp"];
  const svixSignature = req.headers["svix-signature"] || req.headers["Svix-Signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.error("[RESEND WEBHOOK] Missing Svix signature headers");
    return res.status(401).json({ error: "Unauthorized - Missing SVIX signature headers" });
  }

  // 3. Obtener el secreto
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("[RESEND WEBHOOK] RESEND_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "Internal Server Error: Missing secret configuration" });
  }

  // 4. Obtener raw body para validación de la firma
  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";

  // 5. Validar firma de Svix
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
    logger.error("[RESEND WEBHOOK] Signature verification failed with exception", verifyError);
  }

  if (!isValid) {
    logger.error("[RESEND WEBHOOK] Invalid Svix signature");
    return res.status(401).json({ error: "Unauthorized - Invalid signature" });
  }

  // 6. Procesar Payload
  const verifiedEvent = req.body || {};
  const eventType = verifiedEvent.type;

  if (!eventType) {
    logger.error("[RESEND WEBHOOK] Missing event type in payload");
    return res.status(400).json({ error: "Bad Request - Missing event type" });
  }

  // Logs temporales seguros de diagnóstico
  logger.log("[RESEND WEBHOOK] Diagnóstico de evento verificado", {
    typeofVerifiedEvent: typeof verifiedEvent,
    keys: Object.keys(verifiedEvent),
    type: verifiedEvent.type,
    dataKeys: Object.keys(verifiedEvent.data || {}),
    hasEmailId: Boolean(verifiedEvent.data?.email_id)
  });

  // Procesar únicamente eventos email.received. Responder 200 a otros eventos para evitar reintentos.
  if (eventType !== "email.received") {
    logger.log(`[RESEND WEBHOOK] Ignoring non-inbound event: ${eventType}`);
    return res.status(200).json({ success: true, ignored: true, message: `Event ${eventType} ignored` });
  }

  const emailId =
    verifiedEvent?.data?.email_id ||
    verifiedEvent?.email_id ||
    verifiedEvent?.data?.data?.email_id ||
    verifiedEvent?.data?.id;

  if (!emailId) {
    logger.error("[RESEND WEBHOOK] Missing email id in event data");
    return res.status(400).json({ error: "Bad Request - Missing email id" });
  }

  // 7. Evitar duplicados (idempotencia)
  const docRef = admin.firestore().collection("emails").doc(emailId);
  try {
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      logger.log(`[RESEND WEBHOOK] Email ${emailId} already processed. Skipping.`);
      return res.status(200).json({ success: true, duplicated: true });
    }
  } catch (dbError) {
    logger.error("[RESEND WEBHOOK] Error checking document existence", dbError);
    return res.status(500).json({ error: "Database Error" });
  }

  // 8. Consultar contenido completo en Resend utilizando la clave de API de recepción
  const receivingApiKey = process.env.RESEND_RECEIVING_API_KEY;
  if (!receivingApiKey) {
    logger.error("[RESEND INBOUND] Missing RESEND_RECEIVING_API_KEY");
    return res.status(500).json({
      error: "Receiving API key is not configured"
    });
  }

  const receivingResend = new Resend(receivingApiKey);
  let emailContent;
  try {
    logger.log(`[RESEND INBOUND] Fetching complete received email content for ${emailId}`);
    const { data, error } = await receivingResend.emails.receiving.get(emailId);
    if (error) {
      throw new Error(error.message || "Failed to retrieve received email");
    }
    emailContent = data;
  } catch (fetchError) {
    logger.error(`[RESEND INBOUND] Error retrieving email ${emailId} from Resend`, fetchError);
    return res.status(500).json({ error: "Temporary error fetching complete email: " + fetchError.message });
  }

  // 9. Mapear parámetros y normalizar usando directamente el emailContent devuelto
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

  // Mapear adjuntos (solo metadata, sin binario pesado)
  const attachmentsMeta = rawAttachments.map(att => ({
    id: att.id || att.filename,
    name: att.filename,
    size: att.size || 0,
    contentType: att.content_type || att.contentType || ""
  }));

  // Resolver destinatario a usuario de Pixel Mail
  const targetEmail = normalizedTo[0] || "";
  const userId = await resolveUserId(targetEmail);

  if (!userId) {
    logger.error(`[RESEND INBOUND] No user resolved for target email ${targetEmail}`);
  }

  // 10. Guardar en Firestore
  const emailDoc = {
    userId,
    resendEmailId: emailId,
    messageId: headers["message-id"] || headers["Message-ID"] || emailId,
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
    logger.log(`[RESEND INBOUND] Email ${emailId} saved in Firestore successfully for user ${userId}`);
    return res.status(200).json({ success: true, id: emailId });
  } catch (saveError) {
    logger.error(`[RESEND INBOUND] Error saving email ${emailId} in Firestore`, saveError);
    return res.status(500).json({ error: "Failed to save inbound email in Firestore" });
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

  const { emailId, filename } = req.query;
  if (!emailId || !filename) {
    return res.status(400).json({ error: "Missing emailId or filename" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailData = await resend.emails.get(emailId);
    const data = emailData.data || emailData;

    if (!data || !data.attachments) {
      return res.status(404).json({ error: "Email or attachments not found" });
    }

    const attachment = data.attachments.find(att => att.filename === filename);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    if (attachment.content) {
      const buffer = Buffer.isBuffer(attachment.content)
        ? attachment.content
        : Buffer.from(attachment.content, 'base64');
      res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      return res.send(buffer);
    } else if (attachment.url) {
      return res.redirect(attachment.url);
    } else {
      return res.status(404).json({ error: "Attachment content not available" });
    }
  } catch (err) {
    logger.error("[RESEND ATTACHMENT] Error fetching attachment", err);
    return res.status(500).json({ error: err.message });
  }
});
