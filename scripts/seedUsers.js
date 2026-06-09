const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

// ── Data pengguna awal ────────────────────────────────────────────────────────
const users = [
  {
    email: "admin@sodaigroup.id",
    password: "Admin@2025!", // ← Ganti setelah login pertama
    nama: "Ratna Cahyani",
    role: "admin",
    jabatan: "Admin",
  },
  {
    email: "manajer@sodaigroup.id",
    password: "Manajer@2025!",
    nama: "Dewi Kusuma",
    role: "manajer",
    jabatan: "Manajer Produksi",
  },
  {
    email: "produksi@sodaigroup.id",
    password: "Produksi@2025!",
    nama: "Siti Aminah",
    role: "produksi",
    jabatan: "Kepala Tim Jahit",
  },
  {
    email: "gudang@sodaigroup.id",
    password: "Gudang@2025!",
    nama: "Ahmad Fauzi",
    role: "gudang",
    jabatan: "Kepala Gudang",
  },
];

// ── Buat user ─────────────────────────────────────────────────────────────────
async function seedUsers() {
  console.log("🚀 Membuat pengguna awal...\n");

  for (const userData of users) {
    try {
      // Buat di Firebase Authentication
      const userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.nama,
        emailVerified: true,
      });

      // Simpan profil di Firestore
      await db.collection("users").doc(userRecord.uid).set({
        email: userData.email,
        nama: userData.nama,
        role: userData.role,
        jabatan: userData.jabatan,
        aktif: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: null,
      });

      console.log(`✅ Dibuat: ${userData.email} (${userData.role})`);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        console.log(`⚠️  Sudah ada: ${userData.email} — dilewati`);
      } else {
        console.error(`❌ Gagal: ${userData.email} —`, err.message);
      }
    }
  }

  console.log("\n✅ Selesai! Semua pengguna berhasil dibuat.");
  console.log(
    "⚠️  Pastikan pengguna mengganti kata sandi setelah login pertama."
  );
  process.exit(0);
}

seedUsers().catch(console.error);
