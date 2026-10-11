import { getIdToken, signInWithCustomToken, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth as mailAuth } from "../config/firebase";
import { getCentralIdentityAuth } from "./centralIdentity";

/**
 * Candidate only. The server endpoint must authenticate the central Firebase
 * ID token, verify an operator-approved one-to-one mapping, and issue a custom
 * token for the ORIGINAL pixel-mail-a78f6 UID.
 *
 * Not wired into AuthContext: the legacy login remains unchanged until that
 * backend is implemented, reviewed and tested independently.
 */
export async function signInToPixelMailWithCentralIdentity(
  email: string,
  password: string,
): Promise<void> {
  if (import.meta.env.VITE_PIXEL_IDENTITY_LOGIN_ENABLED !== "true") {
    throw new Error("CENTRAL_IDENTITY_DISABLED");
  }

  const centralAuth = getCentralIdentityAuth();
  const url = import.meta.env.VITE_PIXEL_IDENTITY_SESSION_URL?.trim();
  if (!centralAuth || !url || !url.startsWith("https://")) {
    throw new Error("CENTRAL_IDENTITY_NOT_CONFIGURED");
  }
  if (!email || !password) throw new Error("IDENTITY_CREDENTIALS_REQUIRED");

  const session = await signInWithEmailAndPassword(centralAuth, email, password);
  try {
    const idToken = await getIdToken(session.user);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(response.status === 403 ? "IDENTITY_NOT_LINKED" : "IDENTITY_SESSION_FAILED");
    }
    const result: { ok?: boolean; customToken?: string; legacyUid?: string } = await response.json();
    if (result.ok !== true || !result.customToken || !result.legacyUid) {
      throw new Error("IDENTITY_SESSION_INVALID");
    }
    const mailUser = await signInWithCustomToken(mailAuth, result.customToken);
    if (mailUser.user.uid !== result.legacyUid) {
      await signOut(mailAuth);
      throw new Error("IDENTITY_LEGACY_UID_MISMATCH");
    }
  } finally {
    await signOut(centralAuth).catch(() => undefined);
  }
}
