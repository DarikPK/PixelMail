const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { Resend } = require("resend");
const admin = require("firebase-admin");
const Busboy = require("busboy");

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

  // 5. Enviar usando Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    logger.log("[RESEND] sending");

    const emailPayload = {
      from: "David Lachira <david.lachira@pixel.com.pe>",
      to: [to],
      subject: subject,
      html: html.replace(/\n/g, '<br>'),
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
