import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// 1. Tambahkan import getMessaging
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyATCVPxRhRVOhUKar1UiTmVrFQzEHgpq0E",
  authDomain: "sodaigroup-konveksi-65e5d.firebaseapp.com",
  projectId: "sodaigroup-konveksi-65e5d",
  storageBucket: "sodaigroup-konveksi-65e5d.firebasestorage.app",
  messagingSenderId: "1068830121521",
  appId: "1:1068830121521:web:268b100fe6475e8e2a3f10",
};

// Hindari inisialisasi ulang saat hot reload (Next.js dev)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. Inisialisasi messaging (hanya berjalan di client-side browser)
const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

// 3. Tambahkan 'messaging' ke dalam export
export { app, auth, db, messaging };