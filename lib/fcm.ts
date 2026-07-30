import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app, db } from "@/lib/firebase"; 
import { doc, setDoc } from "firebase/firestore";

export async function requestNotificationPermission(userId: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM messaging tidak didukung di browser ini.");
      return null;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      let registration: ServiceWorkerRegistration | undefined;
      if ("serviceWorker" in navigator) {
        registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      }

      const token = await getToken(messaging, {
        vapidKey:
          "BDPoDmmIbYpgMO9hWIg278JJSAS0op6qW7quljntCDPwLXv53QOAotg4fA58dzh7Y7ADn7Cz0sp8CTfrvZDk-TE",
        serviceWorkerRegistration: registration,
      });

      if (token && userId) {
        console.log("FCM Token Berhasil Didapat:", token);
        const userRef = doc(db, "users", userId);
        await setDoc(
          userRef,
          {
            fcmToken: token,
            updatedAt: new Date().toISOString(), 
          },
          { merge: true }
        );

        console.log("Token FCM berhasil disimpan ke database Firestore!");
        return token;
      } else {
        console.warn("Gagal mendapatkan token FCM.");
      }
    } else {
      console.warn("Izin notifikasi ditolak oleh pengguna.");
    }
  } catch (error) {
    console.error("Terjadi kesalahan saat meminta izin notifikasi:", error);
  }
}

// Listener untuk menangkap pesan foreground secara kontinu
export async function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return () => {};
  }

  const supported = await isSupported();
  if (!supported) return () => {};

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}

// Untuk kompatibilitas backward jika ada yang masih memanggil fungsi lama
export function onMessageListener() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    isSupported().then((supported) => {
      if (supported) {
        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
          resolve(payload);
        });
      }
    });
  });
}
