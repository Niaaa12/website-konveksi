import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "sodaigroup-konveksi-65e5d";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.trim();
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { userId, sendToAll, title, body, link } = await request.json();

    const tokens: string[] = [];

    // 1. Jika userId diberikan, coba ambil token dari user tersebut
    if (userId) {
      const userIds = Array.isArray(userId) ? userId : [userId];
      for (const uid of userIds) {
        if (!uid) continue;
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(uid)
          .get();
        if (userDoc.exists) {
          const token = userDoc.data()?.fcmToken;
          if (token && !tokens.includes(token)) {
            tokens.push(token);
          }
        }
      }
    }

    // 2. Jika tidak ada token spesifik ditemukan ATAU sendToAll = true,
    //    ambil seluruh token aktif dari koleksi users
    if (tokens.length === 0 || sendToAll) {
      const snapshot = await admin.firestore().collection("users").get();
      snapshot.forEach((doc) => {
        const token = doc.data()?.fcmToken;
        if (token && !tokens.includes(token)) {
          tokens.push(token);
        }
      });
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada token FCM aktif yang ditemukan di database" },
        { status: 404 }
      );
    }

    const payload = {
      notification: {
        title: title || "Peringatan Sodai Group",
        body: body || "Ada pembaruan penting pada sistem.",
      },
      webpush: {
        fcmOptions: {
          link: link || "/dashboard",
        },
      },
    };

    // 3. Kirim via FCM (single atau multicast)
    let sendResult;
    if (tokens.length === 1) {
      sendResult = await admin.messaging().send({
        token: tokens[0],
        ...payload,
      });
    } else {
      sendResult = await admin.messaging().sendEachForMulticast({
        tokens,
        ...payload,
      });
    }

    // 4. Simpan riwayat notifikasi ke Firestore
    const userIdsArray = userId ? (Array.isArray(userId) ? userId : [userId]) : [];
    await admin.firestore().collection("notifications").add({
      title: title || "Peringatan Sodai Group",
      body: body || "Ada pembaruan penting pada sistem.",
      link: link || "/dashboard",
      userIds: userIdsArray,
      sendToAll: !!sendToAll,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, count: tokens.length, result: sendResult },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Gagal mengirim notifikasi FCM:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
