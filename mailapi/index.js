const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { Resend } = require("resend");
const admin = require("firebase-admin");

admin.initializeApp();

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
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  // 5. Enviar usando Resend
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    logger.log("[RESEND] sending");

    const { data, error } = await resend.emails.send({
      from: "David Lachira <david.lachira@pixel.com.pe>",
      to: [to],
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
      reply_to: "david.lachira@pixel.com.pe",
    });

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
