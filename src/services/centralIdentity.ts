import { getApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/** Optional central identity app; legacy Pixel Mail Auth stays unchanged. */
const NAME = "pixel-resources-identity";

export function getCentralIdentityAuth(): Auth | null {
  const apiKey = import.meta.env.VITE_PIXEL_IDENTITY_API_KEY?.trim();
  if (!apiKey) return null;
  let app: FirebaseApp;
  try {
    app = getApp(NAME);
  } catch {
    app = initializeApp({
      apiKey,
      authDomain: "pixel-resources.firebaseapp.com",
      projectId: "pixel-resources",
    }, NAME);
  }
  return getAuth(app);
}
