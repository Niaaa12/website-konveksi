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
  const ref = await addDoc(collection(db, "workOrders"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

export interface Product {
  id?: string;
  kode: string;
  nama: string;
  deskripsi: string;
  kategoriId: string;
  hargaJual: number;
  aktif: boolean;
}

/** Ambil semua produk aktif */
export async function getProducts(kategoriId?: string): Promise<Product[]> {
  const constraints: QueryConstraint[] = [
    where("aktif", "==", true),
    orderBy("nama"),
  ];
  if (kategoriId) constraints.unshift(where("kategoriId", "==", kategoriId));

  const snap = await getDocs(query(collection(db, "products"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

/** Ambil BOM (resep bahan) untuk satu produk */
export async function getProductBom(productId: string) {
  const snap = await getDocs(collection(db, `products/${productId}/bom`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

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
  jenis: string; // deskripsi detail mesin, mis. "Mesin Jahit High Speed Juki"
  kategori: UnitKategori; // kategori standar untuk pengelompokan & filter
  status: "aktif" | "idle" | "maintenance";
  efisiensi: number; // dihitung otomatis, lihat hitungEfisiensiUnit()
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
 * Hitung efisiensi satu unit produksi berdasarkan histori Work Order-nya.
 * Rumus: Tingkat Output × Tingkat Kualitas × 100
 *   - Tingkat Output  = total jumlahSelesai ÷ total jumlahTarget (semua WO unit ini)
 *   - Tingkat Kualitas = (jumlahSelesai − jumlahCacat) ÷ jumlahSelesai
 * Unit berstatus "maintenance" atau belum pernah punya WO selesai/berjalan → efisiensi 0.
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
 * Ambil semua unit produksi dengan efisiensi yang sudah dihitung ulang
 * (bukan dari field statis di Firestore), berdasarkan WO terbaru.
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

/** Ringkasan unit produksi dikelompokkan per kategori — untuk kartu di dashboard */
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
    .filter((s) => s.total > 0); // sembunyikan kategori yang belum ada unitnya
}

/** Ambil semua unit produksi (mentah, tanpa hitung ulang efisiensi) */
export async function getProductionUnits(): Promise<ProductionUnit[]> {
  const snap = await getDocs(
    query(collection(db, "productionUnits"), orderBy("nama"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionUnit));
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

/** Ambil varian warna sebuah produk */
export async function getProductVariants(productId: string) {
  const snap = await getDocs(collection(db, `products/${productId}/variants`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS / OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface AppUser {
  id?: string;
  email: string;
  nama: string;
  role: "admin" | "manajer" | "produksi" | "gudang";
  jabatan: string;
  aktif: boolean;
}

/** Ambil daftar pengguna yang bisa ditugaskan sebagai operator/PIC work order */
export async function getOperators(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AppUser))
    .filter((u) => u.aktif && (u.role === "produksi" || u.role === "manajer"));
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
