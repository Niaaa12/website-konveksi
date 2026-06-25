const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function upsert(collectionPath, docId, data) {
  await db
    .collection(collectionPath)
    .doc(docId)
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`  ✓ ${collectionPath}/${docId}`);
}

async function seedCollection(name, items) {
  console.log(`\n📂 Seeding: ${name}`);
  for (const item of items) {
    const { id, ...data } = item;

    // Otomatis hitung statusStok untuk collection materials
    if (name === "materials" && data.stokAktual !== undefined) {
      if (data.stokAktual <= data.stokMin * 0.5) {
        data.statusStok = "kritis";
      } else if (data.stokAktual < data.stokMin) {
        data.statusStok = "rendah";
      } else {
        data.statusStok = "aman";
      }
    }

    await upsert(name, id, data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. USERS (Firebase Auth + Firestore)
// ─────────────────────────────────────────────────────────────────────────────

const USERS = [
  {
    email: "admin@sodaigroup.id",
    password: "Admin@2025!",
    nama: "Ifnu Rusdi",
    role: "admin",
    jabatan: "Admin",
  },
  {
    email: "manajer@sodaigroup.id",
    password: "Manajer@2025!",
    nama: "Ridho Irwansyah",
    role: "manajer",
    jabatan: "Manajer Konveksi",
  },
  {
    email: "produksi@sodaigroup.id",
    password: "Produksi@2025!",
    nama: "Afdul Mufti",
    role: "produksi",
    jabatan: "Kepala Tim Produksi",
  },
  {
    email: "gudang@sodaigroup.id",
    password: "Gudang@2025!",
    nama: "Ahmad Fauzan",
    role: "gudang",
    jabatan: "Kepala Gudang",
  },
];

async function seedUsers() {
  console.log("\n👤 Seeding: users (Auth + Firestore)");
  for (const u of USERS) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        console.log(`  ⚠ sudah ada: ${u.email} — update Firestore saja`);
      } catch {
        userRecord = await auth.createUser({
          email: u.email,
          password: u.password,
          displayName: u.nama,
          emailVerified: true,
        });
        console.log(`  ✓ Auth dibuat: ${u.email}`);
      }
      await upsert("users", userRecord.uid, {
        email: u.email,
        nama: u.nama,
        role: u.role,
        jabatan: u.jabatan,
        aktif: true,
        createdAt: FieldValue.serverTimestamp(),
        lastLogin: null,
      });
    } catch (err) {
      console.error(`  ✗ gagal: ${u.email} —`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KATEGORI BAHAN
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_CATEGORIES = [
  {
    id: "cat-kain",
    nama: "Kain",
    deskripsi: "Semua jenis kain utama untuk produksi hijab",
  },
  {
    id: "cat-benang",
    nama: "Benang & Thread",
    deskripsi: "Benang jahit, obras, dan bordiran",
  },
  {
    id: "cat-akses",
    nama: "Aksesoris",
    deskripsi: "Peniti, kancing, magnet, dan aksesori lainnya",
  },
  {
    id: "cat-inner",
    nama: "Inner & Ciput",
    deskripsi: "Ciput rajut, ciput ninja, dan inner sejenisnya",
  },
  {
    id: "cat-label",
    nama: "Label & Tag",
    deskripsi: "Label brand, hangtag, dan size tag",
  },
  {
    id: "cat-kemasan",
    nama: "Kemasan",
    deskripsi: "Plastik, box, stiker, dan kemasan pengiriman",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUPPLIERS
// ─────────────────────────────────────────────────────────────────────────────

const SUPPLIERS = [
  {
    id: "sup-001",
    kode: "SUP-001",
    nama: "CV Tekstil Nusantara",
    kontak: "Bapak Hendra",
    telepon: "0812-3456-7890",
    email: "cs@tekstilnusantara.co.id",
    alamat: "Jl. Tekstil No.12, Bandung",
    aktif: true,
  },
  {
    id: "sup-002",
    kode: "SUP-002",
    nama: "PT Sutera Indah",
    kontak: "Ibu Wulandari",
    telepon: "0821-9876-5432",
    email: "order@suteraindah.com",
    alamat: "Jl. Sutera Raya No.8, Jakarta",
    aktif: true,
  },
  {
    id: "sup-003",
    kode: "SUP-003",
    nama: "PT Garmen Sejahtera",
    kontak: "Bapak Darmawan",
    telepon: "0813-5555-4444",
    email: "sales@garmensejahtera.id",
    alamat: "Kawasan Industri Cikarang Blok C-7",
    aktif: true,
  },
  {
    id: "sup-004",
    kode: "SUP-004",
    nama: "Toko Benang Jaya",
    kontak: "Ibu Sari",
    telepon: "0856-1111-2222",
    email: "benangjaya@gmail.com",
    alamat: "Pasar Tekstil Tanah Abang Lt.3 No.88",
    aktif: true,
  },
  {
    id: "sup-005",
    kode: "SUP-005",
    nama: "CV Label Kreatif",
    kontak: "Mas Rizky",
    telepon: "0857-3333-4444",
    email: "info@labelkreatif.com",
    alamat: "Jl. Percetakan No.45, Surabaya",
    aktif: true,
  },
  {
    id: "sup-006",
    kode: "SUP-006",
    nama: "CV Packaging Jaya",
    kontak: "Ibu Dewi",
    telepon: "0819-7777-8888",
    email: "packaging@cvjaya.co.id",
    alamat: "Jl. Industri Kemasan No.3, Bekasi",
    aktif: true,
  },
  {
    id: "sup-007",
    kode: "SUP-007",
    nama: "Toko Aksesoris Cantik",
    kontak: "Kak Hana",
    telepon: "0878-5678-1234",
    email: "aksesoriscantik@yahoo.com",
    alamat: "Pasar Baru Bandung Blok A No.22",
    aktif: true,
  },
  {
    id: "sup-008",
    kode: "SUP-008",
    nama: "CV Rajut Makmur",
    kontak: "Pak Sugeng",
    telepon: "0812-9999-0000",
    email: "rajutmakmur@gmail.com",
    alamat: "Jl. Rajut No.7, Bandung",
    aktif: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. BAHAN BAKU
// ─────────────────────────────────────────────────────────────────────────────

const MATERIALS = [
  // ── KAIN ──
  {
    id: "mat-001",
    kode: "BB-001",
    nama: "Kain Voal Premium",
    kategoriId: "cat-kain",
    supplierId: "sup-001",
    satuan: "meter",
    stokAktual: 245,
    stokMin: 150,
    stokMaks: 600,
    harga: 28000,
    lokasiGudang: "Rak A-01",
  },
  {
    id: "mat-002",
    kode: "BB-002",
    nama: "Kain Satin Silk",
    kategoriId: "cat-kain",
    supplierId: "sup-002",
    satuan: "meter",
    stokAktual: 88,
    stokMin: 100,
    stokMaks: 400,
    harga: 42000,
    lokasiGudang: "Rak A-02",
  },
  {
    id: "mat-003",
    kode: "BB-003",
    nama: "Kain Jersey Combed 30s",
    kategoriId: "cat-kain",
    supplierId: "sup-001",
    satuan: "meter",
    stokAktual: 312,
    stokMin: 200,
    stokMaks: 800,
    harga: 18500,
    lokasiGudang: "Rak A-03",
  },
  {
    id: "mat-004",
    kode: "BB-004",
    nama: "Kain Ceruti Bubblecrepe",
    kategoriId: "cat-kain",
    supplierId: "sup-003",
    satuan: "meter",
    stokAktual: 65,
    stokMin: 80,
    stokMaks: 300,
    harga: 38000,
    lokasiGudang: "Rak A-04",
  },
  {
    id: "mat-005",
    kode: "BB-005",
    nama: "Kain Wolfis Premium",
    kategoriId: "cat-kain",
    supplierId: "sup-001",
    satuan: "meter",
    stokAktual: 428,
    stokMin: 300,
    stokMaks: 1000,
    harga: 15000,
    lokasiGudang: "Rak A-05",
  },
  {
    id: "mat-006",
    kode: "BB-006",
    nama: "Kain Katun Ima",
    kategoriId: "cat-kain",
    supplierId: "sup-003",
    satuan: "meter",
    stokAktual: 135,
    stokMin: 120,
    stokMaks: 500,
    harga: 22000,
    lokasiGudang: "Rak A-06",
  },
  {
    id: "mat-007",
    kode: "BB-007",
    nama: "Kain Taffeta Premium",
    kategoriId: "cat-kain",
    supplierId: "sup-002",
    satuan: "meter",
    stokAktual: 98,
    stokMin: 80,
    stokMaks: 300,
    harga: 35000,
    lokasiGudang: "Rak A-07",
  },
  // ── BENANG ──
  {
    id: "mat-008",
    kode: "BB-008",
    nama: "Benang Jahit Polyester",
    kategoriId: "cat-benang",
    supplierId: "sup-004",
    satuan: "cone",
    stokAktual: 42,
    stokMin: 30,
    stokMaks: 100,
    harga: 18000,
    lokasiGudang: "Rak B-01",
  },
  {
    id: "mat-009",
    kode: "BB-009",
    nama: "Benang Obras Warna Mix",
    kategoriId: "cat-benang",
    supplierId: "sup-004",
    satuan: "cone",
    stokAktual: 18,
    stokMin: 20,
    stokMaks: 80,
    harga: 22000,
    lokasiGudang: "Rak B-01",
  },
  // ── AKSESORIS ──
  {
    id: "mat-010",
    kode: "BB-010",
    nama: "Peniti Hijab Besar",
    kategoriId: "cat-akses",
    supplierId: "sup-007",
    satuan: "lusin",
    stokAktual: 85,
    stokMin: 50,
    stokMaks: 200,
    harga: 12000,
    lokasiGudang: "Rak B-02",
  },
  {
    id: "mat-011",
    kode: "BB-011",
    nama: "Magnet Hijab Bulat 18mm",
    kategoriId: "cat-akses",
    supplierId: "sup-007",
    satuan: "pcs",
    stokAktual: 450,
    stokMin: 200,
    stokMaks: 1000,
    harga: 2500,
    lokasiGudang: "Rak B-02",
  },
  // ── INNER & CIPUT ──
  {
    id: "mat-012",
    kode: "BB-012",
    nama: "Inner Ciput Rajut",
    kategoriId: "cat-inner",
    supplierId: "sup-008",
    satuan: "pcs",
    stokAktual: 340,
    stokMin: 200,
    stokMaks: 800,
    harga: 8500,
    lokasiGudang: "Rak B-03",
  },
  // ── LABEL & TAG ──
  {
    id: "mat-013",
    kode: "BB-013",
    nama: "Label Brand Woven 5x2cm",
    kategoriId: "cat-label",
    supplierId: "sup-005",
    satuan: "pcs",
    stokAktual: 5200,
    stokMin: 3000,
    stokMaks: 10000,
    harga: 350,
    lokasiGudang: "Rak C-01",
  },
  {
    id: "mat-014",
    kode: "BB-014",
    nama: "Hangtag Karton Premium",
    kategoriId: "cat-label",
    supplierId: "sup-005",
    satuan: "pcs",
    stokAktual: 2800,
    stokMin: 2000,
    stokMaks: 8000,
    harga: 500,
    lokasiGudang: "Rak C-01",
  },
  {
    id: "mat-015",
    kode: "BB-015",
    nama: "Size Tag / Care Label",
    kategoriId: "cat-label",
    supplierId: "sup-005",
    satuan: "pcs",
    stokAktual: 4500,
    stokMin: 2000,
    stokMaks: 10000,
    harga: 200,
    lokasiGudang: "Rak C-02",
  },
  // ── KEMASAN ──
  {
    id: "mat-016",
    kode: "BB-016",
    nama: "Plastik OPP Zipper 30x40",
    kategoriId: "cat-kemasan",
    supplierId: "sup-006",
    satuan: "pcs",
    stokAktual: 3500,
    stokMin: 2000,
    stokMaks: 10000,
    harga: 450,
    lokasiGudang: "Rak D-01",
  },
  {
    id: "mat-017",
    kode: "BB-017",
    nama: "Box Kardus Hijab",
    kategoriId: "cat-kemasan",
    supplierId: "sup-006",
    satuan: "pcs",
    stokAktual: 420,
    stokMin: 500,
    stokMaks: 2000,
    harga: 3500,
    lokasiGudang: "Rak D-02",
  },
  {
    id: "mat-018",
    kode: "BB-018",
    nama: "Stiker Logo Nur Cahaya",
    kategoriId: "cat-kemasan",
    supplierId: "sup-005",
    satuan: "lembar",
    stokAktual: 1200,
    stokMin: 800,
    stokMaks: 4000,
    harga: 500,
    lokasiGudang: "Rak D-01",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. KATEGORI PRODUK
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_CATEGORIES = [
  {
    id: "pcat-01",
    nama: "Segiempat",
    deskripsi: "Hijab segiempat berbagai bahan dan motif",
  },
  { id: "pcat-02", nama: "Pashmina", deskripsi: "Pashmina panjang dan pendek" },
  { id: "pcat-03", nama: "Instan", deskripsi: "Hijab instan siap pakai" },
  { id: "pcat-04", nama: "Khimar", deskripsi: "Khimar syari berbagai ukuran" },
  { id: "pcat-05", nama: "Bergo", deskripsi: "Bergo dan bolak-balik" },
  { id: "pcat-06", nama: "Turban", deskripsi: "Turban rajut dan kain" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRODUK + VARIAN + BOM (subcollection)
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "prod-001",
    kode: "PRD-001",
    nama: "Hijab Voal Motif Bunga",
    kategoriId: "pcat-01",
    bahanUtama: "Voal Premium",
    ukuran: "115x115 cm",
    hargaPokok: 38000,
    aktif: true,
    variants: [
      {
        id: "var-001a",
        namaWarna: "Dusty Pink",
        kodeHex: "#E8C4C4",
        stokJadi: 80,
      },
      {
        id: "var-001b",
        namaWarna: "Baby Blue",
        kodeHex: "#C4D4E8",
        stokJadi: 75,
      },
      {
        id: "var-001c",
        namaWarna: "Sage Green",
        kodeHex: "#C4E8C9",
        stokJadi: 60,
      },
      { id: "var-001d", namaWarna: "Cream", kodeHex: "#E8E4C4", stokJadi: 70 },
      {
        id: "var-001e",
        namaWarna: "Lavender",
        kodeHex: "#D4C4E8",
        stokJadi: 55,
      },
    ],
    bom: [
      {
        id: "bom-001a",
        materialId: "mat-001",
        jumlahPerUnit: 1.2,
        satuan: "meter",
      },
      {
        id: "bom-001b",
        materialId: "mat-008",
        jumlahPerUnit: 0.05,
        satuan: "cone",
      },
      {
        id: "bom-001c",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-001d",
        materialId: "mat-014",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-001e",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-002",
    kode: "PRD-002",
    nama: "Pashmina Satin Polos",
    kategoriId: "pcat-02",
    bahanUtama: "Satin Silk",
    ukuran: "200x75 cm",
    hargaPokok: 48000,
    aktif: true,
    variants: [
      { id: "var-002a", namaWarna: "Hitam", kodeHex: "#2C2C2C", stokJadi: 50 },
      { id: "var-002b", namaWarna: "Maroon", kodeHex: "#8B0000", stokJadi: 45 },
      { id: "var-002c", namaWarna: "Navy", kodeHex: "#1A3A5C", stokJadi: 40 },
      {
        id: "var-002d",
        namaWarna: "Hijau Botol",
        kodeHex: "#3D6B3D",
        stokJadi: 35,
      },
      {
        id: "var-002e",
        namaWarna: "Cokelat Tua",
        kodeHex: "#8B6914",
        stokJadi: 45,
      },
    ],
    bom: [
      {
        id: "bom-002a",
        materialId: "mat-002",
        jumlahPerUnit: 1.5,
        satuan: "meter",
      },
      {
        id: "bom-002b",
        materialId: "mat-008",
        jumlahPerUnit: 0.06,
        satuan: "cone",
      },
      {
        id: "bom-002c",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-002d",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-003",
    kode: "PRD-003",
    nama: "Hijab Jersey Premium Instan",
    kategoriId: "pcat-03",
    bahanUtama: "Jersey Combed",
    ukuran: "Free Size",
    hargaPokok: 30000,
    aktif: true,
    variants: [
      { id: "var-003a", namaWarna: "Cream", kodeHex: "#F5F5DC", stokJadi: 120 },
      {
        id: "var-003b",
        namaWarna: "Abu-abu",
        kodeHex: "#DCDCDC",
        stokJadi: 110,
      },
      { id: "var-003c", namaWarna: "Salmon", kodeHex: "#F08080", stokJadi: 95 },
      {
        id: "var-003d",
        namaWarna: "Sky Blue",
        kodeHex: "#87CEEB",
        stokJadi: 100,
      },
      {
        id: "var-003e",
        namaWarna: "Mint Green",
        kodeHex: "#90EE90",
        stokJadi: 95,
      },
    ],
    bom: [
      {
        id: "bom-003a",
        materialId: "mat-003",
        jumlahPerUnit: 0.9,
        satuan: "meter",
      },
      {
        id: "bom-003b",
        materialId: "mat-009",
        jumlahPerUnit: 0.08,
        satuan: "cone",
      },
      {
        id: "bom-003c",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-003d",
        materialId: "mat-015",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-003e",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-004",
    kode: "PRD-004",
    nama: "Khimar Syari Ceruti",
    kategoriId: "pcat-04",
    bahanUtama: "Ceruti Bubblecrepe",
    ukuran: "XL",
    hargaPokok: 68000,
    aktif: true,
    variants: [
      { id: "var-004a", namaWarna: "Hitam", kodeHex: "#000000", stokJadi: 30 },
      {
        id: "var-004b",
        namaWarna: "Charcoal",
        kodeHex: "#36454F",
        stokJadi: 25,
      },
      { id: "var-004c", namaWarna: "Maroon", kodeHex: "#722F37", stokJadi: 20 },
      {
        id: "var-004d",
        namaWarna: "Hijau Hutan",
        kodeHex: "#355E3B",
        stokJadi: 25,
      },
      {
        id: "var-004e",
        namaWarna: "Cokelat",
        kodeHex: "#4B3832",
        stokJadi: 28,
      },
    ],
    bom: [
      {
        id: "bom-004a",
        materialId: "mat-004",
        jumlahPerUnit: 2.2,
        satuan: "meter",
      },
      {
        id: "bom-004b",
        materialId: "mat-008",
        jumlahPerUnit: 0.1,
        satuan: "cone",
      },
      {
        id: "bom-004c",
        materialId: "mat-009",
        jumlahPerUnit: 0.1,
        satuan: "cone",
      },
      {
        id: "bom-004d",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-004e",
        materialId: "mat-014",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-004f",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-005",
    kode: "PRD-005",
    nama: "Bergo Syari Bolak-balik",
    kategoriId: "pcat-05",
    bahanUtama: "Katun Ima",
    ukuran: "All Size",
    hargaPokok: 55000,
    aktif: true,
    variants: [
      {
        id: "var-005a",
        namaWarna: "Pink / Krem",
        kodeHex: "#E8C4C4",
        stokJadi: 35,
      },
      {
        id: "var-005b",
        namaWarna: "Biru / Putih",
        kodeHex: "#C4C4E8",
        stokJadi: 30,
      },
      {
        id: "var-005c",
        namaWarna: "Hijau / Abu",
        kodeHex: "#C4E8C4",
        stokJadi: 30,
      },
    ],
    bom: [
      {
        id: "bom-005a",
        materialId: "mat-006",
        jumlahPerUnit: 2.0,
        satuan: "meter",
      },
      {
        id: "bom-005b",
        materialId: "mat-008",
        jumlahPerUnit: 0.1,
        satuan: "cone",
      },
      {
        id: "bom-005c",
        materialId: "mat-011",
        jumlahPerUnit: 2,
        satuan: "pcs",
      },
      {
        id: "bom-005d",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-005e",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-006",
    kode: "PRD-006",
    nama: "Hijab Wolfis Polos",
    kategoriId: "pcat-01",
    bahanUtama: "Wolfis",
    ukuran: "130x130 cm",
    hargaPokok: 20000,
    aktif: true,
    variants: [
      { id: "var-006a", namaWarna: "Putih", kodeHex: "#F5F5F5", stokJadi: 150 },
      {
        id: "var-006b",
        namaWarna: "Abu Muda",
        kodeHex: "#C8C8C8",
        stokJadi: 130,
      },
      { id: "var-006c", namaWarna: "Hitam", kodeHex: "#000000", stokJadi: 140 },
      {
        id: "var-006d",
        namaWarna: "Maroon",
        kodeHex: "#8B0000",
        stokJadi: 120,
      },
      { id: "var-006e", namaWarna: "Navy", kodeHex: "#00008B", stokJadi: 138 },
    ],
    bom: [
      {
        id: "bom-006a",
        materialId: "mat-005",
        jumlahPerUnit: 1.4,
        satuan: "meter",
      },
      {
        id: "bom-006b",
        materialId: "mat-008",
        jumlahPerUnit: 0.04,
        satuan: "cone",
      },
      {
        id: "bom-006c",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-006d",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-007",
    kode: "PRD-007",
    nama: "Turban Rajut Motif Pastel",
    kategoriId: "pcat-06",
    bahanUtama: "Rajut Acrylic",
    ukuran: "Free Size",
    hargaPokok: 22000,
    aktif: true,
    variants: [
      {
        id: "var-007a",
        namaWarna: "Pink Pastel",
        kodeHex: "#F4C2C2",
        stokJadi: 25,
      },
      { id: "var-007b", namaWarna: "Lilac", kodeHex: "#C8B8D8", stokJadi: 22 },
      { id: "var-007c", namaWarna: "Mint", kodeHex: "#B8D4C8", stokJadi: 20 },
      { id: "var-007d", namaWarna: "Butter", kodeHex: "#F4E4B8", stokJadi: 22 },
    ],
    bom: [
      {
        id: "bom-007a",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-007b",
        materialId: "mat-015",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-007c",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
  {
    id: "prod-008",
    kode: "PRD-008",
    nama: "Hijab Shimmer Taffeta",
    kategoriId: "pcat-01",
    bahanUtama: "Taffeta Premium",
    ukuran: "115x115 cm",
    hargaPokok: 42000,
    aktif: true,
    variants: [
      { id: "var-008a", namaWarna: "Gold", kodeHex: "#C0A080", stokJadi: 45 },
      { id: "var-008b", namaWarna: "Silver", kodeHex: "#B0A0B0", stokJadi: 40 },
      {
        id: "var-008c",
        namaWarna: "Rose Gold",
        kodeHex: "#C09090",
        stokJadi: 50,
      },
      {
        id: "var-008d",
        namaWarna: "Champagne",
        kodeHex: "#D0C090",
        stokJadi: 41,
      },
    ],
    bom: [
      {
        id: "bom-008a",
        materialId: "mat-007",
        jumlahPerUnit: 1.2,
        satuan: "meter",
      },
      {
        id: "bom-008b",
        materialId: "mat-008",
        jumlahPerUnit: 0.05,
        satuan: "cone",
      },
      {
        id: "bom-008c",
        materialId: "mat-013",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-008d",
        materialId: "mat-014",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
      {
        id: "bom-008e",
        materialId: "mat-016",
        jumlahPerUnit: 1,
        satuan: "pcs",
      },
    ],
  },
];

async function seedProducts() {
  console.log("\n📂 Seeding: products + variants + bom");
  for (const prod of PRODUCTS) {
    const { id, variants, bom, ...data } = prod;
    // Produk utama
    await upsert("products", id, {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Subcollection: variants
    for (const v of variants) {
      const { id: vid, ...vdata } = v;
      await upsert(`products/${id}/variants`, vid, vdata);
    }
    // Subcollection: bom (bill of materials)
    for (const b of bom) {
      const { id: bid, ...bdata } = b;
      await upsert(`products/${id}/bom`, bid, bdata);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. UNIT PRODUKSI
// ─────────────────────────────────────────────────────────────────────────────

// Generator unit produksi sesuai kondisi konveksi sesungguhnya:
// 40 unit jahit, 6 unit obras, 2 unit potong, 3 unit finishing, 2 unit QC.
// Field `efisiensi` TIDAK di-seed statis lagi — dihitung otomatis di aplikasi
// dari histori Work Order tiap unit (lihat hitungEfisiensiUnit() di firestore.ts).
function buatUnitProduksi() {
  const units = [];

  function tambah(jumlah, prefix, kodePrefix, namaDasar, jenisList, kategori) {
    for (let i = 1; i <= jumlah; i++) {
      const no = String(i).padStart(2, "0");
      // Sesekali selipkan status idle/maintenance agar data realistis
      const status =
        i % 17 === 0 ? "maintenance" : i % 11 === 0 ? "idle" : "aktif";
      units.push({
        id: `unit-${prefix}-${no}`,
        kode: `${kodePrefix}-${no}`,
        nama: `${namaDasar} ${i}`,
        jenis: jenisList[i % jenisList.length],
        kategori,
        status,
        jadwalMaintenance: "2025-06-15",
        catatan: status === "maintenance" ? "Perawatan rutin terjadwal" : "",
      });
    }
  }

  tambah(
    40,
    "jahit",
    "MJ",
    "Unit Jahit",
    ["Mesin Jahit High Speed Juki", "Mesin Jahit High Speed Brother"],
    "jahit"
  );

  tambah(
    6,
    "obras",
    "MO",
    "Unit Obras",
    ["Mesin Obras 5 Benang Siruba"],
    "obras"
  );

  tambah(
    2,
    "potong",
    "MP",
    "Unit Potong",
    ["Mesin Potong Kain Otomatis"],
    "potong"
  );

  tambah(
    3,
    "finishing",
    "MF",
    "Unit Finishing",
    ["Meja Finishing & Packing"],
    "finishing"
  );

  tambah(2, "qc", "QC", "Unit QC", ["Meja Quality Control"], "qc");

  return units;
}

const PRODUCTION_UNITS = buatUnitProduksi();

// ─────────────────────────────────────────────────────────────────────────────
// 8. WORK ORDER CONTOH (+ progressLogs subcollection)
// ─────────────────────────────────────────────────────────────────────────────

const WORK_ORDERS = [
  {
    id: "wo-2505-001",
    nomor: "WO-2505-001",
    productId: "prod-001",
    variantId: "var-001a",
    jumlahTarget: 500,
    jumlahSelesai: 420,
    jumlahCacat: 8,
    status: "berjalan",
    prioritas: "tinggi",
    unitId: "unit-jahit-01",
    operatorId: "produksi@sodaigroup.id",
    dibuatOleh: "admin@sodaigroup.id",
    // dibuatOleh: null, // diisi saat runtime
    tanggalMulai: "2025-04-28",
    tanggalTarget: "2025-05-08",
    tanggalSelesai: null,
    catatan: "Batch pertama hijab voal motif bunga — dusty pink",
    progressLogs: [
      {
        id: "log-wo1-01",
        jumlahSelesaiTambah: 200,
        jumlahCacatTambah: 3,
        catatan: "Shift pagi selesai",
        createdAt: new Date("2025-04-29T12:00:00"),
      },
      {
        id: "log-wo1-02",
        jumlahSelesaiTambah: 150,
        jumlahCacatTambah: 2,
        catatan: "Shift sore selesai",
        createdAt: new Date("2025-04-29T17:00:00"),
      },
      {
        id: "log-wo1-03",
        jumlahSelesaiTambah: 70,
        jumlahCacatTambah: 3,
        catatan: "Update pagi ini",
        createdAt: new Date("2025-04-30T11:00:00"),
      },
    ],
  },
  {
    id: "wo-2505-002",
    nomor: "WO-2505-002",
    productId: "prod-002",
    variantId: "var-002a",
    jumlahTarget: 300,
    jumlahSelesai: 300,
    jumlahCacat: 5,
    status: "selesai",
    prioritas: "normal",
    unitId: "unit-jahit-02",
    operatorId: "produksi@sodaigroup.id",
    dibuatOleh: "admin@sodaigroup.id",
    tanggalMulai: "2025-04-22",
    tanggalTarget: "2025-05-02",
    tanggalSelesai: "2025-05-01",
    catatan: "Selesai 1 hari lebih awal",
    progressLogs: [
      {
        id: "log-wo2-01",
        jumlahSelesaiTambah: 150,
        jumlahCacatTambah: 2,
        catatan: "Hari ke-1 selesai",
        createdAt: new Date("2025-04-22T17:00:00"),
      },
      {
        id: "log-wo2-02",
        jumlahSelesaiTambah: 150,
        jumlahCacatTambah: 3,
        catatan: "Hari ke-2 selesai",
        createdAt: new Date("2025-04-23T17:00:00"),
      },
    ],
  },
  {
    id: "wo-2505-003",
    nomor: "WO-2505-003",
    productId: "prod-004",
    variantId: "var-004b",
    jumlahTarget: 150,
    jumlahSelesai: 35,
    jumlahCacat: 2,
    status: "tertunda",
    prioritas: "tinggi",
    unitId: "unit-jahit-03",
    operatorId: "produksi@sodaigroup.id",
    dibuatOleh: "admin@sodaigroup.id",
    tanggalMulai: "2025-05-01",
    tanggalTarget: "2025-05-12",
    tanggalSelesai: null,
    catatan: "Tertunda: stok kain Ceruti kurang",
    progressLogs: [
      {
        id: "log-wo3-01",
        jumlahSelesaiTambah: 35,
        jumlahCacatTambah: 2,
        catatan: "Produksi berhenti sementara karena stok habis",
        createdAt: new Date("2025-05-02T14:00:00"),
      },
    ],
  },
  {
    id: "wo-2505-004",
    nomor: "WO-2505-004",
    productId: "prod-003",
    variantId: null,
    jumlahTarget: 800,
    jumlahSelesai: 400,
    jumlahCacat: 10,
    status: "berjalan",
    prioritas: "normal",
    unitId: "unit-jahit-04",
    operatorId: "produksi@sodaigroup.id",
    dibuatOleh: "admin@sodaigroup.id",
    tanggalMulai: "2025-04-30",
    tanggalTarget: "2025-05-10",
    tanggalSelesai: null,
    catatan: "Mix 5 warna jersey instan",
    progressLogs: [
      {
        id: "log-wo4-01",
        jumlahSelesaiTambah: 200,
        jumlahCacatTambah: 4,
        catatan: "Target 200/hari terpenuhi",
        createdAt: new Date("2025-04-30T17:00:00"),
      },
      {
        id: "log-wo4-02",
        jumlahSelesaiTambah: 200,
        jumlahCacatTambah: 6,
        catatan: "Hari kedua selesai",
        createdAt: new Date("2025-05-01T17:00:00"),
      },
    ],
  },
  {
    id: "wo-2505-005",
    nomor: "WO-2505-005",
    productId: "prod-007",
    variantId: "var-007a",
    jumlahTarget: 200,
    jumlahSelesai: 0,
    jumlahCacat: 0,
    status: "dijadwalkan",
    prioritas: "rendah",
    unitId: "unit-obras-01",
    operatorId: "produksi@sodaigroup.id",
    dibuatOleh: "admin@sodaigroup.id",
    tanggalMulai: "2025-05-10",
    tanggalTarget: "2025-05-20",
    tanggalSelesai: null,
    catatan: "Menunggu bahan rajut tiba dari supplier",
    progressLogs: [],
  },
];

async function seedWorkOrders() {
  console.log("\n📂 Seeding: workOrders + progressLogs");
  for (const wo of WORK_ORDERS) {
    const { id, progressLogs, ...data } = wo;
    await upsert("workOrders", id, {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const log of progressLogs) {
      const { id: lid, createdAt, ...ldata } = log;
      await db
        .collection(`workOrders/${id}/progressLogs`)
        .doc(lid)
        .set(
          {
            ...ldata,
            dicatatOleh: null,
            createdAt: admin.firestore.Timestamp.fromDate(createdAt),
          },
          { merge: true }
        );
      console.log(`    ✓ workOrders/${id}/progressLogs/${lid}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Memulai seed database SIM Konveksi Hijab...");
  console.log("   Project:", serviceAccount.project_id);
  console.log("");

  await seedUsers();
  await seedCollection("materialCategories", MATERIAL_CATEGORIES);
  await seedCollection("suppliers", SUPPLIERS);
  await seedCollection("materials", MATERIALS);
  await seedCollection("productCategories", PRODUCT_CATEGORIES);
  await seedProducts();
  await seedCollection("productionUnits", PRODUCTION_UNITS);
  await seedWorkOrders();

  console.log("\n✅ Seed database selesai!");
  console.log("\n📋 Ringkasan:");
  console.log(`   👤 ${USERS.length} pengguna`);
  console.log(`   🧵 ${MATERIALS.length} bahan baku`);
  console.log(`   👗 ${PRODUCTS.length} produk`);
  console.log(`   🏭 ${PRODUCTION_UNITS.length} unit produksi`);
  console.log(`   📋 ${WORK_ORDERS.length} work order (dengan progress log)`);
  console.log("\n⚠️  Segera ganti kata sandi pengguna setelah login pertama!");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
