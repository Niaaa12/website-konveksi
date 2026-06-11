"use client";

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Filter,
  ChevronDown,
  Loader2,
  Package,
  Tag,
  Layers,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Ruler,
  Shirt,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE DATA
// ─────────────────────────────────────────────────────────────────────────────

interface ProductVariant {
  id?: string;
  namaWarna: string;
  kodeHex: string;
  stokJadi: number;
}

interface BomItem {
  id?: string;
  materialId: string;
  jumlahPerUnit: number;
  satuan: string;
}

interface Product {
  id?: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  kategoriId: string;
  bahanUtama: string;
  ukuran: string;
  hargaPokok: number;
  hargaJual?: number;
  aktif: boolean;
}

interface ProductCategory {
  id?: string;
  nama: string;
  deskripsi?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────

async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("nama"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

async function fetchProductCategories(): Promise<ProductCategory[]> {
  const snap = await getDocs(collection(db, "productCategories"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCategory));
}

async function fetchVariants(productId: string): Promise<ProductVariant[]> {
  const snap = await getDocs(collection(db, `products/${productId}/variants`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductVariant));
}

async function fetchBom(productId: string): Promise<BomItem[]> {
  const snap = await getDocs(collection(db, `products/${productId}/bom`));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BomItem));
}

async function createProduct(data: Omit<Product, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

async function updateProduct(
  productId: string,
  data: Partial<Product>
): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(db, "products", productId));
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN BADGE STATUS
// ─────────────────────────────────────────────────────────────────────────────

function AktifBadge({ aktif }: { aktif: boolean }) {
  return aktif ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DETAIL PRODUK
// ─────────────────────────────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  categories,
  onClose,
  onEdit,
}: {
  product: Product;
  categories: ProductCategory[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [bom, setBom] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);

  const kategoriNama =
    categories.find((c) => c.id === product.kategoriId)?.nama ??
    product.kategoriId;

  useEffect(() => {
    async function load() {
      if (!product.id) return;
      setLoading(true);
      const [v, b] = await Promise.all([
        fetchVariants(product.id),
        fetchBom(product.id),
      ]);
      setVariants(v);
      setBom(b);
      setLoading(false);
    }
    load();
  }, [product.id]);

  const totalStok = variants.reduce((s, v) => s + v.stokJadi, 0);
  const margin = product.hargaJual
    ? Math.round(
        ((product.hargaJual - product.hargaPokok) / product.hargaJual) * 100
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-[#003247]/10 px-2 py-0.5 font-mono text-xs text-[#003247]">
                {product.kode}
              </span>
              <AktifBadge aktif={product.aktif} />
            </div>
            <h2 className="text-base font-semibold truncate">{product.nama}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kategoriNama} · {product.bahanUtama} · {product.ukuran}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Harga */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-border">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">
                Harga Pokok
              </p>
              <p className="text-sm font-semibold">
                Rp {product.hargaPokok.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">
                Harga Jual
              </p>
              <p className="text-sm font-semibold">
                {product.hargaJual ? (
                  `Rp ${product.hargaJual.toLocaleString("id-ID")}`
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Margin</p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  margin !== null && margin >= 20
                    ? "text-emerald-600"
                    : "text-amber-600"
                )}
              >
                {margin !== null ? `${margin}%` : "—"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Varian Warna */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Varian Warna
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Total stok:{" "}
                    <span className="font-medium text-foreground">
                      {totalStok} pcs
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Belum ada varian
                    </p>
                  ) : (
                    variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-border/50 flex-shrink-0"
                          style={{ backgroundColor: v.kodeHex }}
                        />
                        <div>
                          <p className="text-xs font-medium leading-none">
                            {v.namaWarna}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {v.stokJadi} pcs
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* BOM */}
              <div className="px-6 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Bill of Materials (Resep Bahan)
                </h3>
                {bom.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada BOM</p>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr className="text-left text-[10px] font-medium text-muted-foreground">
                          <th className="px-4 py-2">ID Material</th>
                          <th className="px-4 py-2 text-right">
                            Jumlah / Unit
                          </th>
                          <th className="px-4 py-2 text-right">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bom.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2 font-mono text-[#003247]">
                              {b.materialId}
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              {b.jumlahPerUnit}
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground">
                              {b.satuan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM TAMBAH / EDIT PRODUK
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<Product, "id"> = {
  kode: "",
  nama: "",
  deskripsi: "",
  kategoriId: "",
  bahanUtama: "",
  ukuran: "",
  hargaPokok: 0,
  hargaJual: 0,
  aktif: true,
};

function ProductFormModal({
  initial,
  categories,
  onClose,
  onSave,
}: {
  initial?: Product;
  categories: ProductCategory[];
  onClose: () => void;
  onSave: (data: Omit<Product, "id">, id?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<Omit<Product, "id">>(
    initial ? { ...initial } : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!initial?.id;

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kode.trim() || !form.nama.trim() || !form.kategoriId) {
      setError("Kode, nama, dan kategori wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Kode & Nama */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kode Produk <span className="text-red-500">*</span>
                </label>
                <input
                  name="kode"
                  value={form.kode}
                  onChange={handleChange}
                  placeholder="PRD-001"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  name="kategoriId"
                  value={form.kategoriId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nama Produk */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                name="nama"
                value={form.nama}
                onChange={handleChange}
                placeholder="Hijab Voal Motif Bunga"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            {/* Bahan & Ukuran */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Bahan Utama
                </label>
                <input
                  name="bahanUtama"
                  value={form.bahanUtama}
                  onChange={handleChange}
                  placeholder="Voal Premium"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Ukuran
                </label>
                <input
                  name="ukuran"
                  value={form.ukuran}
                  onChange={handleChange}
                  placeholder="115x115 cm"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                />
              </div>
            </div>

            {/* Harga */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Harga Pokok (Rp)
                </label>
                <input
                  type="number"
                  name="hargaPokok"
                  value={form.hargaPokok}
                  onChange={handleChange}
                  min={0}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Harga Jual (Rp)
                </label>
                <input
                  type="number"
                  name="hargaJual"
                  value={form.hargaJual ?? 0}
                  onChange={handleChange}
                  min={0}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Deskripsi
              </label>
              <textarea
                name="deskripsi"
                value={form.deskripsi ?? ""}
                onChange={handleChange}
                rows={2}
                placeholder="Deskripsi singkat produk..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30 resize-none"
              />
            </div>

            {/* Status Aktif */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  name="aktif"
                  checked={form.aktif}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors",
                    form.aktif ? "bg-[#003247]" : "bg-muted"
                  )}
                />
                <div
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.aktif ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </div>
              <span className="text-sm font-medium">
                {form.aktif ? "Produk aktif" : "Produk nonaktif"}
              </span>
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KARTU PRODUK
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  categories,
  variants,
  onClick,
  onEdit,
  onDelete,
}: {
  product: Product;
  categories: ProductCategory[];
  variants: ProductVariant[];
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const kategoriNama =
    categories.find((c) => c.id === product.kategoriId)?.nama ?? "—";
  const totalStok = variants.reduce((s, v) => s + v.stokJadi, 0);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-border bg-card hover:border-[#003247]/40 hover:shadow-sm transition-all overflow-hidden"
    >
      {/* Accent bar atas */}
      <div className="h-1 w-full bg-gradient-to-r from-[#003247] to-[#0088cc] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-4">
        {/* Header kartu */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="rounded bg-[#003247]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#003247]">
                {product.kode}
              </span>
              <AktifBadge aktif={product.aktif} />
            </div>
            <h3 className="text-sm font-semibold leading-snug line-clamp-2">
              {product.nama}
            </h3>
          </div>
          {/* Tombol aksi (muncul saat hover) */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onEdit}
              className="rounded-md border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
              title="Edit produk"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-md border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500 transition-colors"
              title="Hapus produk"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Info bahan & ukuran */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shirt className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{product.bahanUtama}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ruler className="h-3 w-3 flex-shrink-0" />
            <span>{product.ukuran}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3 flex-shrink-0" />
            <span>{kategoriNama}</span>
          </div>
        </div>

        {/* Varian warna */}
        {variants.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex -space-x-1">
              {variants.slice(0, 6).map((v) => (
                <span
                  key={v.id}
                  className="h-4 w-4 rounded-full border-2 border-card"
                  style={{ backgroundColor: v.kodeHex }}
                  title={v.namaWarna}
                />
              ))}
              {variants.length > 6 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-medium">
                  +{variants.length - 6}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">
              {variants.length} warna
            </span>
          </div>
        )}

        {/* Footer: harga & stok */}
        <div className="flex items-end justify-between border-t border-border pt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Harga Pokok</p>
            <p className="text-sm font-semibold text-foreground">
              Rp {product.hargaPokok.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Total Stok</p>
            <p className="text-sm font-semibold text-foreground">
              {totalStok}{" "}
              <span className="text-muted-foreground font-normal text-xs">
                pcs
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN UTAMA KATALOG PRODUK
// ─────────────────────────────────────────────────────────────────────────────

export default function KatalogProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [variantMap, setVariantMap] = useState<
    Record<string, ProductVariant[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Filter & search
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterAktif, setFilterAktif] = useState<
    "semua" | "aktif" | "nonaktif"
  >("semua");

  // Modal state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null | "new">(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  async function loadData() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts().catch((e) => {
          console.error("products error:", e);
          return [];
        }),
        fetchProductCategories().catch((e) => {
          console.error("categories error:", e);
          return [];
        }),
      ]);
      setProducts(prods);
      setCategories(cats);

      // Load variants semua produk secara paralel
      const variantEntries = await Promise.all(
        prods.map(async (p) => {
          const v = await fetchVariants(p.id!).catch(() => []);
          return [p.id!, v] as [string, ProductVariant[]];
        })
      );
      setVariantMap(Object.fromEntries(variantEntries));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Handler simpan (tambah / edit) ──
  async function handleSave(data: Omit<Product, "id">, id?: string) {
    if (id) {
      await updateProduct(id, data);
    } else {
      await createProduct(data);
    }
    await loadData();
  }

  // ── Handler hapus ──
  async function handleDelete() {
    if (!deleteConfirm?.id) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteConfirm.id);
      setDeleteConfirm(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter produk ──
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.nama.toLowerCase().includes(q) ||
      p.kode.toLowerCase().includes(q) ||
      p.bahanUtama.toLowerCase().includes(q);
    const matchKategori = !filterKategori || p.kategoriId === filterKategori;
    const matchAktif =
      filterAktif === "semua" ||
      (filterAktif === "aktif" && p.aktif) ||
      (filterAktif === "nonaktif" && !p.aktif);
    return matchSearch && matchKategori && matchAktif;
  });

  // ── Statistik ringkasan ──
  const totalStokSemua = Object.values(variantMap)
    .flat()
    .reduce((s, v) => s + v.stokJadi, 0);
  const totalVarianSemua = Object.values(variantMap).flat().length;
  const produkAktif = products.filter((p) => p.aktif).length;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">
            Memuat katalog produk...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Produk",
            value: products.length,
            icon: Package,
            color: "bg-blue-100 text-blue-700",
          },
          {
            label: "Produk Aktif",
            value: produkAktif,
            icon: Check,
            color: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Total Varian",
            value: totalVarianSemua,
            icon: Layers,
            color: "bg-violet-100 text-violet-700",
          },
          {
            label: "Total Stok Jadi",
            value: `${totalStokSemua.toLocaleString("id-ID")} pcs`,
            icon: Tag,
            color: "bg-amber-100 text-amber-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("rounded-lg p-1.5", stat.color)}>
                <stat.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="text-xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, atau bahan..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter Kategori */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="appearance-none rounded-xl border border-border bg-card pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 min-w-[160px]"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Filter Status */}
        <div className="flex rounded-xl border border-border bg-card overflow-hidden text-sm">
          {(["semua", "aktif", "nonaktif"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterAktif(opt)}
              className={cn(
                "px-4 py-2.5 capitalize transition-colors",
                filterAktif === opt
                  ? "bg-[#003247] text-white"
                  : "hover:bg-muted/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setEditProduct("new")}
            className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* ── Jumlah hasil ── */}
      <p className="text-xs text-muted-foreground -mt-2">
        Menampilkan{" "}
        <span className="font-medium text-foreground">{filtered.length}</span>{" "}
        dari {products.length} produk
      </p>

      {/* ── Grid Produk ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || filterKategori || filterAktif !== "semua"
              ? "Tidak ada produk yang cocok dengan filter"
              : "Belum ada produk"}
          </p>
          {!search && !filterKategori && filterAktif === "semua" && (
            <button
              onClick={() => setEditProduct("new")}
              className="mt-3 text-xs text-[#003247] hover:underline"
            >
              + Tambah produk pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={categories}
              variants={variantMap[p.id!] ?? []}
              onClick={() => setDetailProduct(p)}
              onEdit={(e) => {
                e.stopPropagation();
                setEditProduct(p);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                setDeleteConfirm(p);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Modal Detail ── */}
      {detailProduct && !editProduct && (
        <ProductDetailModal
          product={detailProduct}
          categories={categories}
          onClose={() => setDetailProduct(null)}
          onEdit={() => {
            setEditProduct(detailProduct);
            setDetailProduct(null);
          }}
        />
      )}

      {/* ── Modal Form Tambah / Edit ── */}
      {editProduct && (
        <ProductFormModal
          initial={editProduct === "new" ? undefined : editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Konfirmasi Hapus ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Hapus Produk?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Produk{" "}
              <span className="font-medium text-foreground">
                {deleteConfirm.nama}
              </span>{" "}
              ({deleteConfirm.kode}) akan dihapus permanen beserta seluruh data
              variannya.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
