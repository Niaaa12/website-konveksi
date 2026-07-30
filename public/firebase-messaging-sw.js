importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyATCVPxRhRVOhUKar1UiTmVrFQzEHgpq0E",
  authDomain: "sodaigroup-konveksi-65e5d.firebaseapp.com",
  projectId: "sodaigroup-konveksi-65e5d",
  storageBucket: "sodaigroup-konveksi-65e5d.firebasestorage.app",
  messagingSenderId: "1068830121521",
  appId: "1:1068830121521:web:268b100fe6475e8e2a3f10",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Menerima pesan latar belakang:",
    payload
  );
  const notificationTitle =
    payload.notification?.title || payload.data?.title || "Notifikasi Sodai Group";
  const targetUrl =
    payload.fcmOptions?.link || payload.data?.link || "/dashboard";

  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "Ada pembaruan penting di sistem.",
    icon: "/favicon.ico",
    data: {
      url: targetUrl,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
