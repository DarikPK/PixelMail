import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDFAlVGtPnhE9_Vgc6OX1I3djPNDRnQWjg",
  authDomain: "pixel-mail-a78f6.firebaseapp.com",
  projectId: "pixel-mail-a78f6",
  storageBucket: "pixel-mail-a78f6.firebasestorage.app",
  messagingSenderId: "477387842345",
  appId: "1:477387842345:web:86815c2ba143575df18d38"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const storage = getStorage(app);

export default app;