import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  type Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDFAlVGtPnhE9_Vgc6OX1I3djPNDRnQWjg',
  authDomain: 'pixel-mail-a78f6.firebaseapp.com',
  projectId: 'pixel-mail-a78f6',
  storageBucket: 'pixel-mail-a78f6.firebasestorage.app',
  messagingSenderId: '477387842345',
  appId: '1:477387842345:web:86815c2ba143575df18d38'
};

// Evita inicializaciones duplicadas durante HMR/desarrollo.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// En web la persistencia de Firestore no viene activada por defecto. Pixel Mail
// no maneja información sensible y se beneficia de conservar la bandeja localmente
// durante cortes breves de internet y entre aperturas del PWA.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: 50 * 1024 * 1024
    })
  });
} catch {
  // En HMR o si otra parte ya inicializó Firestore, reutilizar la instancia.
  firestore = getFirestore(app);
}

// Oculta advertencias transitorias del canal de red; los errores reales siguen visibles.
setLogLevel('error');

export const auth = getAuth(app);
export const db = firestore;
export const storage = getStorage(app);
export default app;
