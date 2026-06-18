// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFAlVGtPnhE9_Vgc6OX1I3djPNDRnQWjg",
  authDomain: "pixel-mail-a78f6.firebaseapp.com",
  projectId: "pixel-mail-a78f6",
  storageBucket: "pixel-mail-a78f6.firebasestorage.app",
  messagingSenderId: "477387842345",
  appId: "1:477387842345:web:86815c2ba143575df18d38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
