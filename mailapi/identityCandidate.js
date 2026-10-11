"use strict";

const admin = require("firebase-admin");

// Prepared for an isolated candidate. Not exported by mailapi/index.js:
// deploying the mail functions cannot activate this module accidentally.
const CENTRAL_PROJECT = "pixel-resources";
const MAIL_PROJECT = "pixel-mail-a78f6";
const CENTRAL_APP_NAME = "pixelmail-central-identity";

function centralAuth() {
  let app = admin.apps.find((item) => item.name === CENTRAL_APP_NAME);
  if (!app) {
    app = admin.initializeApp({ projectId: CENTRAL_PROJECT }, CENTRAL_APP_NAME);
  }
  return app.auth();
}

/**
 * Server-only session exchange for a future independent candidate.
 * The client cannot choose a mail UID. Links must be provisioned by an
 * authorized operator, not by browser writes or this routine.
 */
async function exchangeMailIdentity(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }
  let centralUser;
  try {
    centralUser = await centralAuth().verifyIdToken(header.slice(7), true);
  } catch {
    return res.status(401).json({ ok: false, error: "INVALID_IDENTITY" });
  }

  try {
    const uid = centralUser.uid;
    const linkSnap = await centralAuth().app.firestore().collection("identityLinksPixelMail").doc(uid).get();
    const link = linkSnap.data();
    if (!linkSnap.exists || link?.centralUid !== uid ||
        link?.legacyProject !== MAIL_PROJECT || link?.approved !== true ||
        typeof link?.legacyUid !== "string" || !link.legacyUid ||
        link.legacyUid.includes("/")) {
      return res.status(403).json({ ok: false, error: "IDENTITY_NOT_LINKED" });
    }

    const lockSnap = await centralAuth().app.firestore()
      .collection("identityLocksPixelMail").doc(link.legacyUid).get();
    const lock = lockSnap.data();
    if (!lockSnap.exists || lock?.centralUid !== uid || lock?.legacyUid !== link.legacyUid) {
      return res.status(403).json({ ok: false, error: "IDENTITY_LOCK_MISMATCH" });
    }

    const mailUser = await admin.auth().getUser(link.legacyUid);
    const centralEmail = String(centralUser.email || "").trim().toLowerCase();
    const originalEmail = String(mailUser.email || "").trim().toLowerCase();

    // Both email addresses must be explicitly approved in the identity link.
    if (mailUser.disabled || !centralEmail || !originalEmail ||
        link.centralEmail !== centralEmail ||
        link.legacyEmail !== originalEmail) {
      return res.status(403).json({ ok: false, error: "IDENTITY_ACCOUNT_MISMATCH" });
    }

    const profile = await admin.firestore().collection("users").doc(link.legacyUid).get();
    if (!profile.exists) {
      return res.status(403).json({ ok: false, error: "MAIL_PROFILE_MISSING" });
    }

    const customToken = await admin.auth().createCustomToken(link.legacyUid);
    return res.status(200).json({ ok: true, customToken, legacyUid: link.legacyUid });
  } catch {
    return res.status(503).json({ ok: false, error: "IDENTITY_SESSION_UNAVAILABLE" });
  }
}

module.exports = { exchangeMailIdentity };
