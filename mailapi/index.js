const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { Resend } = require("resend");
const admin = require("firebase-admin");
require("dotenv").config();

admin.initializeApp();

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = onRequest({ cors: true }, async (req, res) => {
  // 1. Validar método
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 2. Validar autenticación
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.error("No se proporcionó token de autenticación");
    return res.status(401).send("Unauthorized");
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    logger.log("Usuario autenticado:", decodedToken.email);
  } catch (error) {
    logger.error("Error al verificar token:", error);
    return res.status(401).send("Unauthorized");
  }

  // 3. Recibir parámetros
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).send("Faltan parámetros requeridos: to, subject, body");
  }

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
      logger.error("[RESEND] send error", error);
      return res.status(500).json({ error: error.message });
    }

    logger.log("[RESEND] sent OK", data.id);
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    logger.error("[RESEND] send error", error);
    return res.status(500).json({ error: error.message });
  }
});
