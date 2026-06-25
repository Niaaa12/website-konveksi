import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE DATA
// ─────────────────────────────────────────────────────────────────────────────

export type WoStatus =
  | "dijadwalkan"
  | "berjalan"
  | "selesai"
  | "tertunda"
  | "batal";
export type WoPrioritas = "rendah" | "normal" | "tinggi";
export type StokStatus = "aman" | "rendah" | "kritis";
export type TxJenis = "masuk" | "keluar" | "koreksi";

export interface WorkOrder {
  id?: string;
  nomor: string;
  productId: string;
  variantId: string | null;
  jumlahTarget: number;
  jumlahSelesai: number;
  jumlahCacat: number;
  status: WoStatus;
  prioritas: WoPrioritas;
  unitId: string;
  operatorId: string;
  tanggalMulai: string;
  tanggalTarget: string;
  tanggalSelesai: string | null;
  dibuatOleh: string;
  catatan: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProgressLog {
  id?: string;
  jumlahSelesaiTambah: number;
  jumlahCacatTambah: number;
  dicatatOleh: string;
  catatan: string;
  createdAt?: Date;
}

export interface Material {
  id?: string;
  kode: string;
  nama: string;
  kategoriId: string;
  supplierId: string;
  satuan: string;
  stokAktual: number;
  stokMin: number;
  stokMaks: number;
  harga: number;
  statusStok?: StokStatus;
  lokasiGudang: string;
  updatedAt?: Date;
}

export interface StockTransaction {
  id?: string;
  materialId: string;
  jenis: TxJenis;
  jumlah: number;
  refTipe: "WO" | "PO" | "KOREKSI";
  refId: string;
  stokSebelum: number;
  stokSesudah: number;
  dilakukanOleh: string;
  catatan: string;
  createdAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/** Ambil semua work order, diurutkan dari terbaru */
export async function getWorkOrders(filters?: {
  status?: WoStatus;
  operatorId?: string;
}): Promise<WorkOrder[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (filters?.status)
    constraints.unshift(where("status", "==", filters.status));
  if (filters?.operatorId)
    constraints.unshift(where("operatorId", "==", filters.operatorId));

  const snap = await getDocs(
    query(collection(db, "workOrders"), ...constraints)
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));
}

/** Ambil satu work order by ID */
export async function getWorkOrder(woId: string): Promise<WorkOrder | null> {
  const snap = await getDoc(doc(db, "workOrders", woId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as WorkOrder;
}

/** Buat work order baru */
export async function createWorkOrder(
  data: Omit<WorkOrder, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  // 1. Buat dokumen WO
  const ref = await addDoc(collection(db, "workOrders"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Otomatis inisialisasi 5 tahap produksi
  //    picId = operatorId WO (PIC yang bertanggung jawab)
  await inisialisasiTahapProduksi(
    ref.id,
    data.jumlahTarget,
    data.operatorId ?? ""
  );

  return ref.id;
}

/** Update semua field WO (untuk manajer/admin) */
export async function updateWorkOrder(
  woId: string,
  data: Partial<WorkOrder>
): Promise<void> {
  await updateDoc(doc(db, "workOrders", woId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Hapus work order */
export async function deleteWorkOrder(woId: string): Promise<void> {
  await deleteDoc(doc(db, "workOrders", woId));
}

/**
 * Update progress WO oleh staf produksi.
 * Menambah jumlah selesai & cacat, lalu mencatat log secara atomik (transaction).
 */
export async function updateWoProgress(
  woId: string,
  operatorId: string,
  tambahSelesai: number,
  tambahCacat: number,
  catatan: string
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const woRef = doc(db, "workOrders", woId);
    const woSnap = await tx.get(woRef);
    if (!woSnap.exists()) throw new Error("Work order tidak ditemukan");

    const wo = woSnap.data() as WorkOrder;
    const newSelesai = wo.jumlahSelesai + tambahSelesai;
    const newCacat = wo.jumlahCacat + tambahCacat;

    // Validasi tidak melebihi target
    if (newSelesai > wo.jumlahTarget) {
      throw new Error(
        `Jumlah selesai (${newSelesai}) melebihi target (${wo.jumlahTarget})`
      );
    }

    // Tentukan status otomatis
    let newStatus: WoStatus = wo.status;
    if (newSelesai >= wo.jumlahTarget) newStatus = "selesai";
    else if (wo.status === "dijadwalkan") newStatus = "berjalan";

    // Update WO utama
    tx.update(woRef, {
      jumlahSelesai: newSelesai,
      jumlahCacat: newCacat,
      status: newStatus,
      tanggalSelesai:
        newStatus === "selesai" ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: serverTimestamp(),
    });

    // Tambah progress log (subcollection)
    const logRef = doc(collection(db, `workOrders/${woId}/progressLogs`));
    tx.set(logRef, {
      jumlahSelesaiTambah: tambahSelesai,
      jumlahCacatTambah: tambahCacat,
      dicatatOleh: operatorId,
      catatan,
      createdAt: serverTimestamp(),
    });
  });
}

/** Ambil progress logs milik sebuah WO */
export async function getProgressLogs(woId: string): Promise<ProgressLog[]> {
  const snap = await getDocs(
    query(
      collection(db, `workOrders/${woId}/progressLogs`),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressLog));
}

/** Realtime listener untuk satu WO (cocok untuk halaman detail WO staf produksi) */
export function listenWorkOrder(
  woId: string,
  callback: (wo: WorkOrder | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "workOrders", woId), (snap) => {
    callback(
      snap.exists() ? ({ id: snap.id, ...snap.data() } as WorkOrder) : null
    );
  });
}

/** Realtime listener untuk semua WO aktif (dashboard) */
export function listenActiveWorkOrders(
  callback: (wos: WorkOrder[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "workOrders"),
      where("status", "in", ["berjalan", "tertunda", "dijadwalkan"]),
      orderBy("createdAt", "desc")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder)));
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIALS (BAHAN BAKU)
// ─────────────────────────────────────────────────────────────────────────────

/** Ambil semua bahan baku */
export async function getMaterials(filters?: {
  kategoriId?: string;
  statusStok?: StokStatus;
}): Promise<Material[]> {
  const constraints: QueryConstraint[] = [orderBy("nama")];
  if (filters?.kategoriId)
    constraints.unshift(where("kategoriId", "==", filters.kategoriId));
  if (filters?.statusStok)
    constraints.unshift(where("statusStok", "==", filters.statusStok));

  const snap = await getDocs(
    query(collection(db, "materials"), ...constraints)
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Material));
}

/** Buat bahan baku baru */
export async function createMaterial(
  data: Omit<Material, "id" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "materials"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update bahan baku */
export async function updateMaterial(
  materialId: string,
  data: Partial<Material>
): Promise<void> {
  await updateDoc(doc(db, "materials", materialId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Hapus bahan baku */
export async function deleteMaterial(materialId: string): Promise<void> {
  await deleteDoc(doc(db, "materials", materialId));
}

/** Realtime listener untuk bahan baku kritis (stok rendah/kritis) */
export function listenCriticalMaterials(
  callback: (materials: Material[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "materials"),
      where("statusStok", "in", ["rendah", "kritis"]),
      orderBy("nama")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Material)));
    }
  );
}

/**
 * Update stok bahan baku secara atomik + catat transaksi.
 * Dipanggil saat: penerimaan bahan (masuk), pemakaian WO (keluar), atau koreksi.
 */
export async function updateMaterialStock(
  materialId: string,
  jumlah: number, // positif = masuk, negatif = keluar
  jenis: TxJenis,
  refTipe: "WO" | "PO" | "KOREKSI",
  refId: string,
  dilakukanOleh: string,
  catatan: string = ""
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const matRef = doc(db, "materials", materialId);
    const matSnap = await tx.get(matRef);
    if (!matSnap.exists()) throw new Error("Bahan baku tidak ditemukan");

    const mat = matSnap.data() as Material;
    const stokLama = mat.stokAktual;
    const stokBaru = stokLama + jumlah;

    if (stokBaru < 0) {
      throw new Error(
        `Stok tidak cukup. Stok saat ini: ${stokLama} ${mat.satuan}`
      );
    }

    // Hitung status stok baru
    let statusStok: StokStatus = "aman";
    if (stokBaru <= mat.stokMin * 0.5) statusStok = "kritis";
    else if (stokBaru < mat.stokMin) statusStok = "rendah";

    // Update stok
    tx.update(matRef, {
      stokAktual: stokBaru,
      statusStok,
      updatedAt: serverTimestamp(),
    });

    // Catat transaksi persediaan
    const txRef = doc(collection(db, "stockTransactions"));
    tx.set(txRef, {
      materialId,
      jenis,
      jumlah: Math.abs(jumlah),
      refTipe,
      refId,
      stokSebelum: stokLama,
      stokSesudah: stokBaru,
      dilakukanOleh,
      catatan,
      createdAt: serverTimestamp(),
    });
  });
}

/** Ambil riwayat transaksi bahan baku */
export async function getStockTransactions(
  materialId: string,
  limitCount: number = 20
): Promise<StockTransaction[]> {
  const snap = await getDocs(
    query(
      collection(db, "stockTransactions"),
      where("materialId", "==", materialId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockTransaction));
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PRODUK — tipe & CRUD lengkap termasuk varian warna dan BOM
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id?: string;
  kode: string;
  nama: string;
  deskripsi: string;
  kategoriId: string;
  bahanUtama: string; // deskripsi singkat bahan, mis. "Voal Premium"
  ukuran: string; // mis. "115x115 cm"
  hargaPokok: number;
  hargaJual: number;
  aktif: boolean;
}

export interface ProductCategory {
  id?: string;
  nama: string;
  deskripsi?: string;
}

/**
 * Varian warna produk.
 * stokJadi: stok produk jadi warna ini (hasil produksi, bukan bahan baku).
 * stokMin:  batas minimum stok — kalau di bawah ini, sistem tandai kritis
 *           dan tim produksi bisa buat WO baru untuk warna ini.
 */
export type UkuranHijab =
  | "All Size"
  | "Anak-anak"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "XXL"
  | "XXXL";

export const UKURAN_OPTIONS: UkuranHijab[] = [
  "All Size",
  "Anak-anak",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
];

export const UKURAN_GROUPS: Record<string, UkuranHijab[]> = {
  Umum: ["All Size"],
  "Anak-anak": ["Anak-anak"],
  Dewasa: ["S", "M", "L", "XL", "XXL", "XXXL"],
};

export interface ProductVariant {
  id?: string;
  namaWarna: string;
  kodeHex: string; // kode warna HEX, mis. "#E8C4C4"
  ukuran: UkuranHijab; // ukuran spesifik varian ini
  stokJadi: number;
  stokMin: number; // default 20 jika tidak diisi
}

/** Status stok varian — dihitung sisi aplikasi, tidak disimpan di Firestore */
export type VariantStokStatus = "aman" | "rendah" | "habis";

export function hitungVariantStokStatus(
  stok: number,
  stokMin: number
): VariantStokStatus {
  if (stok <= 0) return "habis";
  if (stok < stokMin) return "rendah";
  return "aman";
}

/**
 * BOM (Bill of Materials) — resep bahan baku untuk satu produk.
 * Satu baris = satu jenis bahan, jumlah yang dibutuhkan per unit produk.
 * Dipakai untuk estimasi kebutuhan bahan saat buat WO baru.
 */
export interface BomItem {
  id?: string;
  materialId: string; // referensi ke collection materials
  jumlahPerUnit: number; // kebutuhan bahan per 1 pcs produk
  satuan: string; // "meter", "cone", "pcs", dst
  catatan?: string;
}

// ── Produk CRUD ──────────────────────────────────────────────────────────────

/** Ambil semua produk, bisa filter kategori dan status aktif */
export async function getProducts(
  kategoriId?: string,
  aktifSaja = false
): Promise<Product[]> {
  const constraints: QueryConstraint[] = [orderBy("nama")];
  if (aktifSaja) constraints.unshift(where("aktif", "==", true));
  if (kategoriId) constraints.unshift(where("kategoriId", "==", kategoriId));
  const snap = await getDocs(query(collection(db, "products"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function createProduct(
  data: Omit<Product, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<void> {
  await updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, "products", id));
}

/** Ambil semua kategori produk */
export async function getProductCategories(): Promise<ProductCategory[]> {
  const snap = await getDocs(collection(db, "productCategories"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCategory));
}

// ── Kategori Produk CRUD ──────────────────────────────────────────────────────

export async function createProductCategory(
  data: Omit<ProductCategory, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "productCategories"), {
    nama: data.nama,
    deskripsi: data.deskripsi ?? "",
  });
  return ref.id;
}

export async function updateProductCategory(
  id: string,
  data: Omit<ProductCategory, "id">
): Promise<void> {
  await updateDoc(doc(db, "productCategories", id), {
    nama: data.nama,
    deskripsi: data.deskripsi ?? "",
  });
}

export async function deleteProductCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "productCategories", id));
}

// ── Varian Warna CRUD ─────────────────────────────────────────────────────────

/** Ambil semua varian warna sebuah produk, diurutkan nama */
export async function getProductVariants(
  productId: string
): Promise<ProductVariant[]> {
  const snap = await getDocs(
    query(
      collection(db, `products/${productId}/variants`),
      orderBy("namaWarna")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductVariant));
}

/**
 * Ambil varian warna yang stoknya kritis atau habis.
 * Dipakai untuk notifikasi dan tombol "Buat WO" cepat.
 */
export async function getVarianKritis(
  productId: string
): Promise<ProductVariant[]> {
  const variants = await getProductVariants(productId);
  return variants.filter(
    (v) => hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !== "aman"
  );
}

export async function getVariantsByProductIds(
  productIds: string[]
): Promise<Record<string, ProductVariant[]>> {
  const unique = [...new Set(productIds)].filter(Boolean);
  if (unique.length === 0) return {};

  const results = await Promise.all(
    unique.map((pid) =>
      getProductVariants(pid)
        .then((variants) => ({ pid, variants }))
        .catch(() => ({ pid, variants: [] as ProductVariant[] }))
    )
  );

  return Object.fromEntries(
    results.map(({ pid, variants }) => [pid, variants])
  );
}

export async function createProductVariant(
  productId: string,
  data: Omit<ProductVariant, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, `products/${productId}/variants`), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  data: Partial<ProductVariant>
): Promise<void> {
  await updateDoc(doc(db, `products/${productId}/variants/${variantId}`), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProductVariant(
  productId: string,
  variantId: string
): Promise<void> {
  await deleteDoc(doc(db, `products/${productId}/variants/${variantId}`));
}

// ── BOM CRUD ─────────────────────────────────────────────────────────────────

/** Ambil BOM (resep bahan) untuk satu produk */
export async function getProductBom(productId: string): Promise<BomItem[]> {
  const snap = await getDocs(collection(db, `products/${productId}/bom`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BomItem));
}

export async function createBomItem(
  productId: string,
  data: Omit<BomItem, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, `products/${productId}/bom`), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBomItem(
  productId: string,
  bomId: string,
  data: Partial<BomItem>
): Promise<void> {
  await updateDoc(doc(db, `products/${productId}/bom/${bomId}`), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBomItem(
  productId: string,
  bomId: string
): Promise<void> {
  await deleteDoc(doc(db, `products/${productId}/bom/${bomId}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIT PRODUKSI
// Field `kategori` dipakai untuk pengelompokan (jahit/obras/potong/finishing/qc).
// Field `jenis` tetap ada sebagai deskripsi detail mesin ("Mesin Jahit Juki").
// Field `efisiensi` TIDAK disimpan statis — dihitung otomatis dari histori WO
// via hitungEfisiensiUnit() setiap kali data di-load.
// ─────────────────────────────────────────────────────────────────────────────

export type UnitKategori =
  | "jahit"
  | "obras"
  | "potong"
  | "finishing"
  | "qc"
  | "lainnya";

export interface ProductionUnit {
  id?: string;
  kode: string;
  nama: string;
  jenis: string; // deskripsi detail, mis. "Mesin Jahit High Speed Juki"
  kategori: UnitKategori; // kategori standar untuk pengelompokan & filter
  status: "aktif" | "idle" | "maintenance";
  efisiensi: number; // dihitung otomatis via hitungEfisiensiUnit()
  jadwalMaintenance: string;
  catatan: string;
  picId?: string;
}

export interface UnitKategoriSummary {
  kategori: UnitKategori;
  label: string;
  total: number;
  aktif: number;
  idle: number;
  maintenance: number;
  rataEfisiensi: number;
}

const KATEGORI_LABEL: Record<UnitKategori, string> = {
  jahit: "Jahit",
  obras: "Obras",
  potong: "Potong",
  finishing: "Finishing",
  qc: "QC",
  lainnya: "Lainnya",
};

/**
 * Hitung efisiensi satu unit produksi dari histori Work Order-nya.
 * Rumus: Tingkat Output × Tingkat Kualitas × 100
 *   Tingkat Output   = Σ jumlahSelesai ÷ Σ jumlahTarget
 *   Tingkat Kualitas = (Σ jumlahSelesai − Σ jumlahCacat) ÷ Σ jumlahSelesai
 *
 * Unit berstatus "maintenance" atau belum punya WO aktif → efisiensi 0.
 * Ini jauh lebih akurat daripada menyimpan angka statis di Firestore.
 */
export function hitungEfisiensiUnit(
  unitId: string,
  unitStatus: string,
  workOrders: WorkOrder[]
): number {
  if (unitStatus === "maintenance") return 0;

  const woUnit = workOrders.filter(
    (wo) =>
      wo.unitId === unitId &&
      (wo.status === "berjalan" || wo.status === "selesai")
  );
  if (woUnit.length === 0) return 0;

  const totalTarget = woUnit.reduce((s, wo) => s + wo.jumlahTarget, 0);
  const totalSelesai = woUnit.reduce((s, wo) => s + wo.jumlahSelesai, 0);
  const totalCacat = woUnit.reduce((s, wo) => s + wo.jumlahCacat, 0);

  if (totalTarget === 0 || totalSelesai === 0) return 0;

  const tingkatOutput = Math.min(1, totalSelesai / totalTarget);
  const tingkatKualitas = Math.max(
    0,
    (totalSelesai - totalCacat) / totalSelesai
  );

  return Math.round(tingkatOutput * tingkatKualitas * 100);
}

/**
 * Ambil semua unit produksi, efisiensinya dihitung ulang dari WO terbaru.
 * Gunakan fungsi ini untuk halaman Lini Produksi (tampilan lengkap per unit).
 */
export async function getProductionUnitsWithEfisiensi(): Promise<
  ProductionUnit[]
> {
  const [unitsSnap, wos] = await Promise.all([
    getDocs(query(collection(db, "productionUnits"), orderBy("nama"))),
    getWorkOrders(),
  ]);
  return unitsSnap.docs.map((d) => {
    const unit = { id: d.id, ...d.data() } as ProductionUnit;
    return {
      ...unit,
      efisiensi: hitungEfisiensiUnit(unit.id!, unit.status, wos),
    };
  });
}

/**
 * Ambil semua unit produksi (mentah, tanpa hitung ulang efisiensi).
 * Gunakan di tempat yang hanya butuh daftar unit tanpa kalkulasi berat,
 * misalnya dropdown pilih unit di form Work Order.
 */
export async function getProductionUnits(): Promise<ProductionUnit[]> {
  const snap = await getDocs(
    query(collection(db, "productionUnits"), orderBy("nama"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionUnit));
}

/**
 * Ringkasan unit dikelompokkan per kategori — untuk kartu di Dashboard.
 * Menampilkan berapa unit aktif/idle/maintenance per jenis
 * (Jahit 38/40, Obras 5/6, dst) tanpa perlu fetch 53 dokumen satu per satu
 * di halaman Dashboard.
 */
export async function getProductionUnitsSummary(): Promise<
  UnitKategoriSummary[]
> {
  const units = await getProductionUnitsWithEfisiensi();
  const kategoriList: UnitKategori[] = [
    "jahit",
    "obras",
    "potong",
    "finishing",
    "qc",
    "lainnya",
  ];

  return kategoriList
    .map((kategori) => {
      const grup = units.filter((u) => u.kategori === kategori);
      const aktifList = grup.filter((u) => u.status === "aktif");
      return {
        kategori,
        label: KATEGORI_LABEL[kategori],
        total: grup.length,
        aktif: aktifList.length,
        idle: grup.filter((u) => u.status === "idle").length,
        maintenance: grup.filter((u) => u.status === "maintenance").length,
        rataEfisiensi:
          aktifList.length > 0
            ? Math.round(
                aktifList.reduce((s, u) => s + u.efisiensi, 0) /
                  aktifList.length
              )
            : 0,
      };
    })
    .filter((s) => s.total > 0); // sembunyikan kategori yang belum punya unit
}

/** Buat unit produksi baru */
export async function createProductionUnit(
  data: Omit<ProductionUnit, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "productionUnits"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update unit produksi */
export async function updateProductionUnit(
  id: string,
  data: Partial<ProductionUnit>
): Promise<void> {
  await updateDoc(doc(db, "productionUnits", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Hapus unit produksi */
export async function deleteProductionUnit(id: string): Promise<void> {
  await deleteDoc(doc(db, "productionUnits", id));
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS (agregasi sederhana)
// ─────────────────────────────────────────────────────────────────────────────

/** Ambil statistik ringkasan untuk dashboard */
export async function getDashboardStats() {
  const [woSnap, matCritSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "workOrders"),
        where("status", "in", ["berjalan", "tertunda", "dijadwalkan"])
      )
    ),
    getDocs(
      query(collection(db, "materials"), where("statusStok", "==", "kritis"))
    ),
  ]);

  const wos = woSnap.docs.map((d) => d.data() as WorkOrder);

  return {
    woAktif: wos.filter((w) => w.status === "berjalan").length,
    woTertunda: wos.filter((w) => w.status === "tertunda").length,
    woDijadwalkan: wos.filter((w) => w.status === "dijadwalkan").length,
    stokKritis: matCritSnap.size,
    totalProgress: wos.reduce((s, w) => s + w.jumlahSelesai, 0),
    totalTarget: wos.reduce((s, w) => s + w.jumlahTarget, 0),
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// TAHAP PRODUKSI
// Subcollection di bawah tiap workOrder:
//   workOrders/{woId}/tahapProduksi/{tahapId}
// Setiap WO punya tepat 5 dokumen (satu per tahap).
// PIC yang update — bukan operator mesin.
// ─────────────────────────────────────────────────────────────────────────────

export type TahapId = "potong" | "jahit" | "obras" | "finishing" | "packing";

export type TahapStatus =
  | "belum_mulai" // WO baru dibuat, tahap belum dimulai
  | "berlangsung" // sedang dikerjakan
  | "selesai" // tahap ini selesai, lanjut ke berikutnya
  | "ada_masalah"; // ada kendala — perlu perhatian manajer

export interface TahapProduksi {
  id?: string; // = TahapId ("potong", "jahit", dst)
  tahap: TahapId;
  urutanTahap: number; // 1–5, untuk sorting
  status: TahapStatus;
  jumlahMasuk: number; // berapa pcs masuk ke tahap ini
  jumlahSelesai: number; // berapa pcs selesai dari tahap ini
  jumlahCacat: number; // reject di tahap ini
  catatanKendala: string; // opsional, diisi kalau ada masalah
  picId: string; // UID PIC yang update
  updatedAt?: any;
  mulaiAt?: any; // kapan tahap ini pertama kali mulai
  selesaiAt?: any; // kapan tahap ini diselesaikan
}

// Urutan dan label tahap — single source of truth
export const TAHAP_CONFIG: Record<
  TahapId,
  { label: string; urutan: number; labelPendek: string }
> = {
  potong: { label: "Pemotongan Kain", labelPendek: "Potong", urutan: 1 },
  jahit: { label: "Penjahitan", labelPendek: "Jahit", urutan: 2 },
  obras: { label: "Obras", labelPendek: "Obras", urutan: 3 },
  finishing: { label: "Finishing & QC", labelPendek: "Finishing", urutan: 4 },
  packing: { label: "Packing", labelPendek: "Packing", urutan: 5 },
};

export const URUTAN_TAHAP: TahapId[] = [
  "potong",
  "jahit",
  "obras",
  "finishing",
  "packing",
];

/** Ambil semua tahap produksi sebuah WO, diurutkan sesuai alur produksi */
export async function getTahapProduksi(woId: string): Promise<TahapProduksi[]> {
  const snap = await getDocs(
    query(
      collection(db, `workOrders/${woId}/tahapProduksi`),
      orderBy("urutanTahap")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TahapProduksi));
}

/**
 * Inisialisasi 5 dokumen tahap untuk WO baru.
 * Dipanggil otomatis saat WO dibuat, bukan manual.
 * jumlahMasuk tahap pertama (potong) = jumlahTarget WO.
 */
export async function inisialisasiTahapProduksi(
  woId: string,
  jumlahTarget: number,
  picId: string
): Promise<void> {
  const batch = writeBatch(db);
  URUTAN_TAHAP.forEach((tahapId, idx) => {
    const ref = doc(db, `workOrders/${woId}/tahapProduksi/${tahapId}`);
    batch.set(ref, {
      tahap: tahapId,
      urutanTahap: idx + 1,
      status: idx === 0 ? "berlangsung" : "belum_mulai",
      jumlahMasuk: idx === 0 ? jumlahTarget : 0,
      jumlahSelesai: 0,
      jumlahCacat: 0,
      catatanKendala: "",
      picId,
      updatedAt: serverTimestamp(),
      mulaiAt: idx === 0 ? serverTimestamp() : null,
      selesaiAt: null,
    } satisfies Omit<TahapProduksi, "id">);
  });
  await batch.commit();
}

/**
 * PIC update progress satu tahap.
 * Kalau tahap diselesaikan (status = "selesai"), otomatis:
 *   - set selesaiAt
 *   - buka (status = "berlangsung") tahap berikutnya
 *   - set jumlahMasuk tahap berikutnya = jumlahSelesai tahap ini
 */
export async function updateTahapProduksi(
  woId: string,
  tahapId: TahapId,
  update: {
    jumlahSelesai: number;
    jumlahCacat: number;
    catatanKendala: string;
    status: TahapStatus;
    picId: string;
  }
): Promise<void> {
  const tahapRef = doc(db, `workOrders/${woId}/tahapProduksi/${tahapId}`);
  const selesai = update.status === "selesai";

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tahapRef);
    if (!snap.exists()) throw new Error(`Tahap ${tahapId} tidak ditemukan.`);

    // Update tahap ini
    tx.update(tahapRef, {
      jumlahSelesai: update.jumlahSelesai,
      jumlahCacat: update.jumlahCacat,
      catatanKendala: update.catatanKendala,
      status: update.status,
      picId: update.picId,
      updatedAt: serverTimestamp(),
      ...(selesai ? { selesaiAt: serverTimestamp() } : {}),
    });

    // Kalau selesai, buka tahap berikutnya
    if (selesai) {
      const urutanSekarang = TAHAP_CONFIG[tahapId].urutan;
      const tahapBerikutnyaId = URUTAN_TAHAP[urutanSekarang]; // urutan 1-based, index 0-based
      if (tahapBerikutnyaId) {
        const nextRef = doc(
          db,
          `workOrders/${woId}/tahapProduksi/${tahapBerikutnyaId}`
        );
        tx.update(nextRef, {
          status: "berlangsung",
          jumlahMasuk: update.jumlahSelesai,
          mulaiAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Kalau tahap terakhir (packing) selesai, update status WO jadi selesai
      if (tahapId === "packing") {
        const woRef = doc(db, "workOrders", woId);
        tx.update(woRef, {
          status: "selesai",
          jumlahSelesai: update.jumlahSelesai,
          jumlahCacat: update.jumlahCacat,
          tanggalSelesai: new Date().toISOString().slice(0, 10),
          updatedAt: serverTimestamp(),
        });
      }
    }
  });
}

/**
 * Ambil WO yang ditugaskan ke PIC tertentu (berdasarkan operatorId),
 * beserta semua tahap produksinya sekaligus.
 * Untuk halaman Progress PIC.
 */
export async function getWOdanTahapByPIC(
  picId: string
): Promise<Array<WorkOrder & { tahap: TahapProduksi[] }>> {
  const snap = await getDocs(
    query(
      collection(db, "workOrders"),
      where("operatorId", "==", picId),
      where("status", "in", ["berjalan", "dijadwalkan", "tertunda"]),
      orderBy("tanggalTarget")
    )
  );

  const wos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));

  // Ambil tahap semua WO secara paralel
  const tahapList = await Promise.all(
    wos.map((wo) => getTahapProduksi(wo.id!).catch(() => []))
  );

  return wos.map((wo, i) => ({ ...wo, tahap: tahapList[i] }));
}

/** Listener real-time untuk tahap produksi satu WO (untuk manajer di desktop) */
export function listenTahapProduksi(
  woId: string,
  callback: (tahap: TahapProduksi[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, `workOrders/${woId}/tahapProduksi`),
      orderBy("urutanTahap")
    ),
    (snap) =>
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as TahapProduksi))
      )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RINGKASAN TAHAP PRODUKSI — untuk Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface TahapSummary {
  tahapId: TahapId;
  label: string;
  labelPendek: string;
  jumlahWO: number; // berapa WO sedang di tahap ini
  jumlahWOMasalah: number; // berapa WO ada masalah di tahap ini
  totalMasuk: number; // total pcs masuk di semua WO untuk tahap ini
  totalSelesai: number; // total pcs selesai
  totalCacat: number; // total pcs cacat
}

/**
 * Ambil ringkasan per tahap produksi dari semua WO yang sedang aktif.
 * Dipakai di Dashboard sebagai gambaran bottleneck produksi hari ini.
 */
export async function getTahapProduksiSummary(): Promise<TahapSummary[]> {
  // Ambil semua WO aktif
  const woSnap = await getDocs(
    query(
      collection(db, "workOrders"),
      where("status", "in", ["berjalan", "dijadwalkan", "tertunda"])
    )
  );
  const woIds = woSnap.docs.map((d) => d.id);
  if (woIds.length === 0)
    return URUTAN_TAHAP.map((id) => ({
      tahapId: id,
      ...TAHAP_CONFIG[id],
      jumlahWO: 0,
      jumlahWOMasalah: 0,
      totalMasuk: 0,
      totalSelesai: 0,
      totalCacat: 0,
    }));

  // Ambil tahap semua WO aktif secara paralel
  const semuaTahap = await Promise.all(
    woIds.map((id) => getTahapProduksi(id).catch(() => [] as TahapProduksi[]))
  );

  // Agregasi per tahapId
  const map: Record<TahapId, TahapSummary> = {} as any;
  URUTAN_TAHAP.forEach((id) => {
    map[id] = {
      tahapId: id,
      label: TAHAP_CONFIG[id].label,
      labelPendek: TAHAP_CONFIG[id].labelPendek,
      jumlahWO: 0,
      jumlahWOMasalah: 0,
      totalMasuk: 0,
      totalSelesai: 0,
      totalCacat: 0,
    };
  });

  semuaTahap.forEach((tahapPerWO) => {
    tahapPerWO.forEach((t) => {
      if (!map[t.tahap]) return;
      // Hitung WO yang sedang di tahap ini (berlangsung atau ada masalah)
      if (t.status === "berlangsung" || t.status === "ada_masalah") {
        map[t.tahap].jumlahWO++;
        if (t.status === "ada_masalah") map[t.tahap].jumlahWOMasalah++;
      }
      map[t.tahap].totalMasuk += t.jumlahMasuk;
      map[t.tahap].totalSelesai += t.jumlahSelesai;
      map[t.tahap].totalCacat += t.jumlahCacat;
    });
  });

  return URUTAN_TAHAP.map((id) => map[id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export interface AppUser {
  id?: string;
  email: string;
  nama: string;
  role: "admin" | "manajer" | "produksi" | "gudang";
  jabatan: string;
  aktif: boolean;
}

export async function getOperators(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AppUser))
    .filter((u) => u.aktif && (u.role === "produksi" || u.role === "manajer"));
}
