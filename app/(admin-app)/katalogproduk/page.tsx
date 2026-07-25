"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductBom,
  createBomItem,
  updateBomItem,
  deleteBomItem,
  getMaterials,
  hitungVariantStokStatus,
  UKURAN_GROUPS,
  type Product,
  type ProductCategory,
  type ProductVariant,
  type BomItem,
  type Material,
  type UkuranHijab,
} from "@/lib/firestore";
import { cn } from "@/lib/utils";
import { useRBAC } from "@/hooks/useRBAC";
import {
  Plus,
  Search,
  Loader2,
  X,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  Package,
  Tag,
  Layers,
  Shirt,
  Ruler,
  Palette,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Droplets,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// BADGE & UTIL
// ─────────────────────────────────────────────────────────────────────────────

function AktifBadge({ aktif }: { aktif: boolean }) {
  return aktif ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800">
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

function StokVarianBadge({ stok, stokMin }: { stok: number; stokMin: number }) {
  const status = hitungVariantStokStatus(stok, stokMin);
  if (status === "habis")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <span className="h-1 w-1 rounded-full bg-red-500" />
        Habis
      </span>
    );
  if (status === "rendah")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <span className="h-1 w-1 rounded-full bg-amber-500" />
        Hampir Habis
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Aman
    </span>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30";
const selectClass = cn(inputClass, "appearance-none");

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM PRODUK (Tambah / Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface ProductForm {
  kode: string;
  nama: string;
  deskripsi: string;
  kategoriId: string;
  bahanUtama: string;
  ukuran: string;
  hargaPokok: number;
  hargaJual: number;
  aktif: boolean;
}

const EMPTY_PRODUCT: ProductForm = {
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
  onSave: (data: ProductForm, id?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<ProductForm>(
    initial
      ? {
          kode: initial.kode,
          nama: initial.nama,
          deskripsi: initial.deskripsi,
          kategoriId: initial.kategoriId,
          bahanUtama: initial.bahanUtama ?? "",
          ukuran: initial.ukuran ?? "",
          hargaPokok: initial.hargaPokok ?? 0,
          hargaJual: initial.hargaJual ?? 0,
          aktif: initial.aktif,
        }
      : { ...EMPTY_PRODUCT }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof ProductForm, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
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
      setError(err.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{" "}
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kode Produk <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kode}
                  onChange={(e) => set("kode", e.target.value)}
                  placeholder="PRD-001"
                  className={cn(inputClass, "font-mono")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.kategoriId}
                  onChange={(e) => set("kategoriId", e.target.value)}
                  className={selectClass}
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
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Hijab Voal Motif Bunga"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Bahan Utama
                </label>
                <input
                  value={form.bahanUtama}
                  onChange={(e) => set("bahanUtama", e.target.value)}
                  placeholder="Voal Premium"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Ukuran
                </label>
                <input
                  value={form.ukuran}
                  onChange={(e) => set("ukuran", e.target.value)}
                  placeholder="115x115 cm"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Harga Pokok (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.hargaPokok}
                  onChange={(e) => set("hargaPokok", Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Harga Jual (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.hargaJual}
                  onChange={(e) => set("hargaJual", Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Deskripsi
              </label>
              <textarea
                value={form.deskripsi}
                onChange={(e) => set("deskripsi", e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat produk..."
                className={cn(inputClass, "resize-none")}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(e) => set("aktif", e.target.checked)}
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
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isEdit ? "Simpan" : "Tambah Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL VARIAN WARNA
// ─────────────────────────────────────────────────────────────────────────────

interface VariantForm {
  namaWarna: string;
  kodeHex: string;
  ukuran: UkuranHijab;
  stokJadi: number;
  stokMin: number;
}
const EMPTY_VARIANT: VariantForm = {
  namaWarna: "",
  kodeHex: "#E8C4C4",
  ukuran: "All Size",
  stokJadi: 0,
  stokMin: 20,
};

// Palet warna hijab yang umum — bisa dipilih cepat
const PALET_WARNA = [
  "#000000",
  "#FFFFFF",
  "#F5F5DC",
  "#DCDCDC",
  "#E8E4C4",
  "#F08080",
  "#E8C4C4",
  "#D4C4E8",
  "#C4D4E8",
  "#C4E8C9",
  "#87CEEB",
  "#90EE90",
  "#8B0000",
  "#1A3A5C",
  "#3D6B3D",
  "#8B6914",
  "#C2956C",
  "#E8D5B0",
];

function VarianWarnaPanelInline({
  productId,
  jumlahTarget,
  onVariantChange,
}: {
  productId: string;
  jumlahTarget: number;
  onVariantChange?: (variants: ProductVariant[]) => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductVariant | null>(null);
  const [form, setForm] = useState<VariantForm>({ ...EMPTY_VARIANT });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await getProductVariants(productId);
      setVariants(latest);
      // Beritahu halaman induk supaya variantMap ikut terupdate
      onVariantChange?.(latest);
    } finally {
      setLoading(false);
    }
  }, [productId, onVariantChange]);

  useEffect(() => {
    load();
  }, [load]);

  function bukaForm(v?: ProductVariant) {
    setError("");
    if (v) {
      setEditTarget(v);
      setForm({
        namaWarna: v.namaWarna,
        kodeHex: v.kodeHex,
        ukuran: v.ukuran ?? "All Size",
        stokJadi: v.stokJadi,
        stokMin: v.stokMin ?? 20,
      });
    } else {
      setEditTarget(null);
      setForm({ ...EMPTY_VARIANT });
    }
    setFormOpen(true);
  }

  function tutupForm() {
    setFormOpen(false);
    setEditTarget(null);
    setError("");
  }

  async function handleSave() {
    if (!form.namaWarna.trim()) {
      setError("Nama warna wajib diisi.");
      return;
    }
    if (!form.kodeHex.match(/^#[0-9A-Fa-f]{6}$/)) {
      setError("Kode HEX tidak valid, contoh: #E8C4C4");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editTarget?.id) {
        // Sisipkan status lama (jika ada) atau default "Aktif"
        await updateProductVariant(productId, editTarget.id, {
          ...form,
          status: editTarget.status || "Aktif",
        });
      } else {
        // Sisipkan status default "Aktif" saat membuat baru
        await createProductVariant(productId, { ...form, status: "Aktif" });
      }
      tutupForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: ProductVariant) {
    if (!v.id) return;
    if (!confirm(`Hapus varian warna "${v.namaWarna}"?`)) return;
    await deleteProductVariant(productId, v.id);
    await load();
  }

  const stokKritis = variants.filter(
    (v) => hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !== "aman"
  );

  return (
    <div className="space-y-3">
      {/* Alert stok kritis */}
      {stokKritis.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {stokKritis.length} varian stok rendah/habis
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5">
              {stokKritis.map((v) => v.namaWarna).join(", ")} — pertimbangkan
              membuat Work Order baru
            </p>
          </div>
        </div>
      )}

      {/* Daftar varian */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <Palette className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Belum ada varian warna
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Kelompokkan varian per warna, ukuran sebagai baris di dalamnya */}
          {Array.from(new Set(variants.map((v) => v.namaWarna))).map(
            (warna) => {
              const varianWarna = variants.filter((v) => v.namaWarna === warna);
              const hex = varianWarna[0]?.kodeHex ?? "#ccc";
              const totalStok = varianWarna.reduce((s, v) => s + v.stokJadi, 0);
              const adaKritis = varianWarna.some(
                (v) =>
                  hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !==
                  "aman"
              );
              return (
                <div
                  key={warna}
                  className={cn(
                    "rounded-xl border overflow-hidden",
                    adaKritis
                      ? "border-amber-200 dark:border-amber-800"
                      : "border-border"
                  )}
                >
                  {/* Header kelompok warna */}
                  <div
                    className={cn(
                      "flex items-center justify-between px-3 py-2 border-b",
                      adaKritis
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-5 w-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-xs font-semibold truncate">
                        {warna}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
                        {hex}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                      Total:{" "}
                      <span className="font-medium text-foreground">
                        {totalStok.toLocaleString("id-ID")}
                      </span>{" "}
                      pcs
                    </span>
                  </div>
                  {/* Tabel ukuran di dalam warna ini — overflow-x-auto agar tidak terpotong */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="bg-muted/10 border-b border-border text-[10px] font-medium text-muted-foreground">
                          <th className="px-3 py-1.5 text-left">Ukuran</th>
                          <th className="px-3 py-1.5 text-right">Stok Jadi</th>
                          <th className="px-3 py-1.5 text-right">Min.</th>
                          <th className="px-3 py-1.5 text-left">Status</th>
                          <th className="px-3 py-1.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {varianWarna.map((v) => (
                          <tr
                            key={v.id}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
                                  v.ukuran === "All Size"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : v.ukuran === "Anak-anak"
                                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                )}
                              >
                                {v.ukuran ?? "—"}
                              </span>
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right text-xs font-semibold",
                                hitungVariantStokStatus(
                                  v.stokJadi,
                                  v.stokMin ?? 20
                                ) === "habis"
                                  ? "text-red-600"
                                  : hitungVariantStokStatus(
                                      v.stokJadi,
                                      v.stokMin ?? 20
                                    ) === "rendah"
                                  ? "text-amber-600"
                                  : "text-foreground"
                              )}
                            >
                              {v.stokJadi.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                              {(v.stokMin ?? 20).toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-2">
                              <StokVarianBadge
                                stok={v.stokJadi}
                                stokMin={v.stokMin ?? 20}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => bukaForm(v)}
                                  title="Edit"
                                  className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(v)}
                                  title="Hapus"
                                  className="rounded-lg border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Form tambah/edit varian (inline collapsible) */}
      {formOpen ? (
        <div className="rounded-xl border border-[#003247]/30 bg-[#003247]/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {editTarget ? "Edit Varian" : "Tambah Varian Warna"}
            </p>
            <button
              onClick={tutupForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Palet cepat */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
              Pilih Warna Cepat
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PALET_WARNA.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, kodeHex: hex }))}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all",
                    form.kodeHex === hex
                      ? "border-[#003247] scale-110"
                      : "border-transparent hover:border-border"
                  )}
                  style={{ backgroundColor: hex }}
                  title={hex}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Nama Warna <span className="text-red-500">*</span>
              </label>
              <input
                value={form.namaWarna}
                onChange={(e) =>
                  setForm((p) => ({ ...p, namaWarna: e.target.value }))
                }
                placeholder="Dusty Pink"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Kode HEX
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="h-9 w-9 rounded-xl border border-border flex-shrink-0"
                  style={{ backgroundColor: form.kodeHex }}
                />
                <input
                  value={form.kodeHex}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kodeHex: e.target.value }))
                  }
                  placeholder="#E8C4C4"
                  className={cn(inputClass, "font-mono")}
                />
              </div>
            </div>
          </div>

          {/* Pilih Ukuran */}
          <div>
            <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
              Ukuran <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {Object.entries(UKURAN_GROUPS).map(([grup, ukuranList]) => (
                <div key={grup}>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {grup}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ukuranList.map((uk) => (
                      <button
                        key={uk}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, ukuran: uk }))}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          form.ukuran === uk
                            ? "bg-[#003247] text-white border-[#003247]"
                            : "bg-background border-border hover:border-[#003247]/50 hover:bg-muted/30"
                        )}
                      >
                        {uk}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Stok Jadi (pcs)
              </label>
              <input
                type="number"
                min={0}
                value={form.stokJadi}
                onChange={(e) =>
                  setForm((p) => ({ ...p, stokJadi: Number(e.target.value) }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Stok Minimum (pcs)
              </label>
              <input
                type="number"
                min={0}
                value={form.stokMin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, stokMin: Number(e.target.value) }))
                }
                className={inputClass}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Di bawah ini → alert kritis
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={tutupForm}
              className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-muted/50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-[#003247] px-3 py-2 text-xs font-medium text-white hover:bg-[#004a6e] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {editTarget ? "Simpan" : "Tambah"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => bukaForm()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah Varian Warna
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL BOM (PILIHAN BAHAN)
// ─────────────────────────────────────────────────────────────────────────────

interface BomForm {
  ukuran: string; // <-- Tambahan ukuran
  materialId: string;
  jumlahPerUnit: number;
  satuan: string;
  catatan: string;
}
const EMPTY_BOM: BomForm = {
  ukuran: "",
  materialId: "",
  jumlahPerUnit: 0,
  satuan: "meter",
  catatan: "",
};
const SATUAN_OPTIONS = [
  "meter",
  "kg",
  "gram",
  "cone",
  "pcs",
  "roll",
  "liter",
  "lusin",
  "gross",
];

function BomPanelInline({
  productId,
  materials,
  variants, // <-- Terima props variants
}: {
  productId: string;
  materials: Material[];
  variants: ProductVariant[];
}) {
  const [bomList, setBomList] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BomItem | null>(null);
  const [form, setForm] = useState<BomForm>({ ...EMPTY_BOM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Ekstrak ukuran unik dari daftar varian
  const availableSizes = Array.from(
    new Set(variants.map((v) => v.ukuran || "All Size"))
  );

  // 2. State untuk melacak ukuran yang aktif
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Set default size
  useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  const matMap = useMemo(() => {
    const m: Record<string, Material> = {};
    materials.forEach((mat) => {
      if (mat.id) m[mat.id] = mat;
    });
    return m;
  }, [materials]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBomList(await getProductBom(productId));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // 3. Filter BOM berdasarkan ukuran yang dipilih
  const currentBoms = bomList.filter((bom) => bom.ukuran === selectedSize);

  function bukaForm(b?: BomItem) {
    setError("");
    if (b) {
      setEditTarget(b);
      setForm({
        ukuran: b.ukuran,
        materialId: b.materialId,
        jumlahPerUnit: b.jumlahPerUnit,
        satuan: b.satuan,
        catatan: b.catatan ?? "",
      });
    } else {
      setEditTarget(null);
      setForm({ ...EMPTY_BOM, ukuran: selectedSize }); // Set ukuran otomatis saat tambah baru
    }
    setFormOpen(true);
  }

  function tutupForm() {
    setFormOpen(false);
    setEditTarget(null);
    setError("");
  }

  async function handleSave() {
    if (!form.materialId) {
      setError("Pilih bahan baku.");
      return;
    }
    if (form.jumlahPerUnit <= 0) {
      setError("Jumlah per unit harus lebih dari 0.");
      return;
    }
    // Cek duplikat material di ukuran yang SAMA
    const sudahAda = bomList.some(
      (b) =>
        b.materialId === form.materialId &&
        b.ukuran === form.ukuran &&
        b.id !== editTarget?.id
    );
    if (sudahAda) {
      setError(`Bahan ini sudah ada di daftar BOM ukuran ${form.ukuran}.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editTarget?.id) {
        // Sisipkan productId agar tipe data BomItem terpenuhi
        await updateBomItem(productId, editTarget.id, { ...form, productId });
      } else {
        await createBomItem(productId, { ...form, productId });
      }
      tutupForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: BomItem) {
    if (!b.id) return;
    const mat = matMap[b.materialId];
    if (
      !confirm(
        `Hapus bahan "${mat?.nama ?? b.materialId}" dari BOM ukuran ${
          b.ukuran
        }?`
      )
    )
      return;
    await deleteBomItem(productId, b.id);
    await load();
  }

  const bahanBelumDipilih = materials.filter(
    (m) =>
      m.id &&
      !currentBoms.some((b) => b.materialId === m.id && b.id !== editTarget?.id)
  );

  return (
    <div className="space-y-4">
      {/* --- Switcher Ukuran --- */}
      {availableSizes.length > 0 ? (
        <div className="flex flex-col space-y-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            Pilih Ukuran:
          </span>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors border",
                  selectedSize === size
                    ? "bg-[#003247] text-white border-[#003247]"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          ⚠️ Tambahkan varian warna/ukuran terlebih dahulu di tab Varian Warna.
        </div>
      )}

      {selectedSize && (
        <div className="space-y-3">
          {/* Daftar BOM */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : currentBoms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Belum ada resep bahan untuk ukuran{" "}
                <strong>{selectedSize}</strong>
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 border-b border-border flex justify-between items-center">
                <span className="text-xs font-semibold">
                  Resep: Ukuran {selectedSize}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 border-b border-border text-[10px] font-medium text-muted-foreground">
                    <th className="px-3 py-2 text-left">Bahan Baku</th>
                    <th className="px-3 py-2 text-right">Jumlah / Unit</th>
                    <th className="px-3 py-2 text-left">Satuan</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentBoms.map((b) => {
                    const mat = matMap[b.materialId];
                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <p className="text-xs font-medium">
                            {mat?.nama ?? b.materialId}
                          </p>
                          {mat && (
                            <p className="text-[10px] text-muted-foreground">
                              {mat.kode} · Stok:{" "}
                              {mat.stokAktual.toLocaleString("id-ID")}{" "}
                              {mat.satuan}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold">
                          {b.jumlahPerUnit}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {b.satuan}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => bukaForm(b)}
                              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60"
                              title="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              className="rounded-lg border border-red-200 bg-background p-1.5 text-red-500 hover:bg-red-50"
                              title="Hapus"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Form Tambah/Edit inline */}
          {formOpen ? (
            <div className="rounded-xl border border-[#003247]/30 bg-[#003247]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">
                  {editTarget
                    ? `Edit Bahan (Ukuran ${selectedSize})`
                    : `Tambah Bahan (Ukuran ${selectedSize})`}
                </p>
                <button
                  onClick={tutupForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* === Sisa Form persis sama dengan kodemu sebelumnya (Pilih bahan, input jumlah, satuan, dsb) === */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-700">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />{" "}
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Bahan Baku <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.materialId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, materialId: e.target.value }))
                  }
                  className={selectClass}
                >
                  <option value="">Pilih bahan baku</option>
                  {editTarget && matMap[editTarget.materialId] && (
                    <option value={editTarget.materialId}>
                      {matMap[editTarget.materialId].nama}
                    </option>
                  )}
                  {bahanBelumDipilih.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama} ({m.kode}) — stok: {m.stokAktual} {m.satuan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Jumlah per Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.jumlahPerUnit}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        jumlahPerUnit: Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Satuan
                  </label>
                  <select
                    value={form.satuan}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, satuan: e.target.value }))
                    }
                    className={selectClass}
                  >
                    {SATUAN_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Catatan (opsional)
                </label>
                <input
                  value={form.catatan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, catatan: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={tutupForm}
                  className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-muted/50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-[#003247] px-3 py-2 text-xs font-medium text-white hover:bg-[#004a6e] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {editTarget ? "Simpan" : "Tambah"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => bukaForm()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Bahan (Ukuran{" "}
              {selectedSize})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DETAIL PRODUK (dengan tab Varian Warna + BOM)
// ─────────────────────────────────────────────────────────────────────────────

type DetailTab = "info" | "varian" | "bom";

function ProductDetailModal({
  product,
  categories,
  materials,
  variants, // <-- 1. Tambahkan ini di parameter
  onClose,
  onEdit,
  onVariantChange,
}: {
  product: Product;
  categories: ProductCategory[];
  materials: Material[];
  variants: ProductVariant[]; // <-- 2. Tambahkan ini di tipe parameter
  onClose: () => void;
  onEdit?: () => void;
  onVariantChange?: (productId: string, variants: ProductVariant[]) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("info");
  const kategoriNama =
    categories.find((c) => c.id === product.kategoriId)?.nama ?? "—";
  const margin =
    product.hargaJual && product.hargaPokok
      ? Math.round(
          ((product.hargaJual - product.hargaPokok) / product.hargaJual) * 100
        )
      : null;

  // Stable callback agar VarianWarnaPanelInline tidak re-fetch terus (infinite loop)
  const handleVariantChangeInner = useCallback(
    (variants: ProductVariant[]) => {
      if (product.id) onVariantChange?.(product.id, variants);
    },
    // product.id dan onVariantChange stabil dari parent (useCallback), aman sebagai dep
    [product.id, onVariantChange]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
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
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-border">
          {(
            [
              { id: "info", label: "Info Produk", icon: Package },
              { id: "varian", label: "Varian Warna", icon: Palette },
              { id: "bom", label: "Resep Bahan", icon: BookOpen },
            ] as { id: DetailTab; label: string; icon: React.ElementType }[]
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                  tab === t.id
                    ? "border-[#003247] text-[#003247]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {/* Tab: Info */}
          {tab === "info" && (
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Harga Pokok",
                    value: product.hargaPokok
                      ? `Rp ${product.hargaPokok.toLocaleString("id-ID")}`
                      : "—",
                  },
                  {
                    label: "Harga Jual",
                    value: product.hargaJual
                      ? `Rp ${product.hargaJual.toLocaleString("id-ID")}`
                      : "—",
                  },
                  {
                    label: "Margin",
                    value: margin !== null ? `${margin}%` : "—",
                    color:
                      margin !== null
                        ? margin >= 20
                          ? "text-emerald-600"
                          : "text-amber-600"
                        : "",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/40 p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className={cn("text-sm font-semibold", item.color)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              {product.deskripsi && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Deskripsi
                  </p>
                  <p className="text-xs">{product.deskripsi}</p>
                </div>
              )}
              <div className="space-y-2">
                {[
                  { label: "Kategori", value: kategoriNama },
                  { label: "Bahan Utama", value: product.bahanUtama || "—" },
                  { label: "Ukuran", value: product.ukuran || "—" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Varian Warna */}
          {tab === "varian" && product.id && (
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-4">
                Kelola stok tiap warna. Kalau stok di bawah minimum, akan muncul
                alert dan tim produksi bisa buat WO baru untuk warna tersebut.
              </p>
              <VarianWarnaPanelInline
                productId={product.id}
                jumlahTarget={0}
                onVariantChange={handleVariantChangeInner}
              />
            </div>
          )}

          {/* Tab: BOM */}
          {tab === "bom" && product.id && (
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-4">
                Pilih ukuran produk di bawah ini untuk mengatur resep bahan baku
                per <span className="font-medium">1 pcs</span>.
              </p>
              <BomPanelInline
                productId={product.id}
                materials={materials}
                variants={variants} // <-- 3. Teruskan data ke sini
              />
            </div>
          )}
        </div>
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
  variantCount,
  stokKritisCount,
  onClick,
  onEdit,
  onDelete,
}: {
  product: Product;
  categories: ProductCategory[];
  variantCount: number;
  stokKritisCount: number;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const kategoriNama =
    categories.find((c) => c.id === product.kategoriId)?.nama ?? "—";

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-border bg-card hover:border-[#003247]/40 hover:shadow-sm transition-all overflow-hidden"
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#003247] to-[#0088cc] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="rounded bg-[#003247]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#003247]">
                {product.kode}
              </span>
              <AktifBadge aktif={product.aktif} />
              {stokKritisCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  <AlertTriangle className="h-2.5 w-2.5" /> {stokKritisCount}{" "}
                  kritis
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-snug line-clamp-2">
              {product.nama}
            </h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded-md border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-md border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500 transition-colors"
                title="Hapus"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shirt className="h-3 w-3 flex-shrink-0" />{" "}
            <span className="truncate">{product.bahanUtama || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ruler className="h-3 w-3 flex-shrink-0" />{" "}
            <span>{product.ukuran || "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3 flex-shrink-0" />{" "}
            <span>{kategoriNama}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Harga Jual</p>
            <p className="text-sm font-semibold">
              {product.hargaJual
                ? `Rp ${product.hargaJual.toLocaleString("id-ID")}`
                : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Varian</p>
            <p className="text-sm font-semibold">
              {variantCount}{" "}
              <span className="text-muted-foreground font-normal text-xs">
                warna
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

// ─────────────────────────────────────────────────────────────────────────────
// MODAL KELOLA KATEGORI
// ─────────────────────────────────────────────────────────────────────────────

function KategoriModal({
  categories,
  onClose,
  onRefresh,
}: {
  categories: ProductCategory[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const emptyForm = { nama: "", deskripsi: "" };
  const [form, setForm] = useState(emptyForm);
  const [editTarget, setEditTarget] = useState<ProductCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function bukaEdit(cat: ProductCategory) {
    setEditTarget(cat);
    setForm({ nama: cat.nama, deskripsi: cat.deskripsi ?? "" });
    setError("");
  }

  function resetForm() {
    setEditTarget(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSave() {
    if (!form.nama.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editTarget?.id) {
        await updateProductCategory(editTarget.id, {
          nama: form.nama.trim(),
          deskripsi: form.deskripsi.trim(),
        });
      } else {
        await createProductCategory({
          nama: form.nama.trim(),
          deskripsi: form.deskripsi.trim(),
        });
      }
      await onRefresh();
      resetForm();
    } catch (e) {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteProductCategory(deleteTarget.id);
      await onRefresh();
      setDeleteTarget(null);
    } catch (e) {
      setError(
        "Gagal menghapus. Pastikan tidak ada produk dengan kategori ini."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-16 pb-8 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#003247]/10">
              <Tag className="h-4 w-4 text-[#003247]" />
            </span>
            <h2 className="text-sm font-semibold">Kelola Kategori</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Form Tambah / Edit */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">
              {editTarget ? `Edit: ${editTarget.nama}` : "Tambah Kategori Baru"}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nama: e.target.value }))
                }
                placeholder="cth. Hijab Voal, Pashmina, Turban..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Deskripsi{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </label>
              <input
                type="text"
                value={form.deskripsi}
                onChange={(e) =>
                  setForm((p) => ({ ...p, deskripsi: e.target.value }))
                }
                placeholder="Keterangan singkat kategori..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              {editTarget && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted/60 transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-xs font-medium text-white hover:bg-[#004a6e] disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : editTarget ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {saving
                  ? "Menyimpan..."
                  : editTarget
                  ? "Simpan Perubahan"
                  : "Tambah Kategori"}
              </button>
            </div>
          </div>

          {/* Daftar Kategori */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Kategori Tersedia ({categories.length})
            </p>
            {categories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                Belum ada kategori. Tambahkan di atas.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 transition-colors",
                      editTarget?.id === cat.id
                        ? "bg-[#003247]/5"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{cat.nama}</p>
                      {cat.deskripsi && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {cat.deskripsi}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => bukaEdit(cat)}
                        className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="rounded-lg border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </span>
              <div>
                <p className="text-sm font-semibold">Hapus Kategori?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  &quot;{deleteTarget.nama}&quot; akan dihapus permanen.
                </p>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setError("");
                }}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted/60 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KatalogProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [variantMap, setVariantMap] = useState<
    Record<string, ProductVariant[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterAktif, setFilterAktif] = useState<
    "semua" | "aktif" | "nonaktif"
  >("semua");

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showKategoriModal, setShowKategoriModal] = useState(false);

  const { can } = useRBAC();
  const canWrite = can(["admin", "kepalaTimProduksi"]);

  // Stable callback — tidak berubah referensi antar render, mencegah infinite loop
  // di VarianWarnaPanelInline yang pakai onVariantChange sebagai useCallback dep
  const handleVariantChange = useCallback(
    (productId: string, variants: ProductVariant[]) => {
      setVariantMap((prev) => ({ ...prev, [productId]: variants }));
    },
    []
  );

  async function loadData() {
    setLoading(true);
    try {
      const [prods, cats, mats] = await Promise.all([
        getProducts().catch((e) => {
          console.error(e);
          return [];
        }),
        getProductCategories().catch((e) => {
          console.error(e);
          return [];
        }),
        getMaterials().catch((e) => {
          console.error(e);
          return [];
        }),
      ]);
      setProducts(prods);
      setCategories(cats);
      setMaterials(mats);

      // Load varian semua produk secara paralel
      const entries = await Promise.all(
        prods.map(async (p) => {
          const v = await getProductVariants(p.id!).catch(() => []);
          return [p.id!, v] as [string, ProductVariant[]];
        })
      );
      setVariantMap(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }

  // Refresh hanya kategori — dipakai oleh KategoriModal tanpa reload seluruh halaman
  async function loadCategories() {
    const cats = await getProductCategories().catch(
      () => [] as ProductCategory[]
    );
    setCategories(cats);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(data: ProductForm, id?: string) {
    if (id) await updateProduct(id, data);
    else await createProduct(data);
    await loadData();
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          p.nama.toLowerCase().includes(q) ||
          p.kode.toLowerCase().includes(q) ||
          (p.bahanUtama ?? "").toLowerCase().includes(q);
        const matchKategori =
          !filterKategori || p.kategoriId === filterKategori;
        const matchAktif =
          filterAktif === "semua" ||
          (filterAktif === "aktif" ? p.aktif : !p.aktif);
        return matchSearch && matchKategori && matchAktif;
      }),
    [products, search, filterKategori, filterAktif]
  );

  // Hitung stat ringkasan
  const totalVarian = Object.values(variantMap).flat().length;
  const totalStokJadi = Object.values(variantMap)
    .flat()
    .reduce((s, v) => s + v.stokJadi, 0);
  const varianKritis = Object.values(variantMap)
    .flat()
    .filter(
      (v) => hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !== "aman"
    );
  const produkAktif = products.filter((p) => p.aktif).length;

  // Untuk tiap produk, berapa varian kritis
  function stokKritisCount(productId: string) {
    return (variantMap[productId] ?? []).filter(
      (v) => hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !== "aman"
    ).length;
  }

  if (loading)
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

  return (
    <div className="space-y-6">
      {/* Alert stok varian kritis */}
      {varianKritis.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Stok Varian Perlu Perhatian
            </p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {varianKritis.filter((v) => v.stokJadi <= 0).length > 0 &&
                `${
                  varianKritis.filter((v) => v.stokJadi <= 0).length
                } varian habis. `}
              {varianKritis.filter((v) => v.stokJadi > 0).length > 0 &&
                `${
                  varianKritis.filter((v) => v.stokJadi > 0).length
                } varian hampir habis. `}
              Buka detail produk → tab Varian Warna untuk membuat Work Order.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex-shrink-0 rounded-lg border border-amber-200 p-1.5 hover:bg-amber-100 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
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
            value: totalVarian,
            icon: Palette,
            color: "bg-violet-100 text-violet-700",
          },
          {
            label: "Stok Jadi",
            value: `${totalStokJadi.toLocaleString("id-ID")} pcs`,
            icon: Layers,
            color: "bg-amber-100 text-amber-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <span className={cn("inline-flex rounded-lg p-1.5 mb-2", s.color)}>
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <div className="relative">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="appearance-none rounded-xl border border-border bg-card pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 min-w-[160px]"
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
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowKategoriModal(true)}
              className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <Tag className="h-4 w-4" /> Kelola Kategori
            </button>
          )}
          {canWrite && (
            <button
              onClick={() => setEditProduct("new")}
              className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Produk
            </button>
          )}
          {showKategoriModal && (
            <KategoriModal
              categories={categories}
              onClose={() => setShowKategoriModal(false)}
              onRefresh={loadCategories}
            />
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Menampilkan{" "}
        <span className="font-medium text-foreground">{filtered.length}</span>{" "}
        dari {products.length} produk
      </p>

      {/* Grid Produk */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || filterKategori || filterAktif !== "semua"
              ? "Tidak ada produk yang cocok dengan filter"
              : "Belum ada produk"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              categories={categories}
              variantCount={(variantMap[p.id!] ?? []).length}
              stokKritisCount={stokKritisCount(p.id!)}
              onClick={() => setDetailProduct(p)}
              onEdit={canWrite ? (e) => {
                e.stopPropagation();
                setEditProduct(p);
              } : undefined}
              onDelete={canWrite ? (e) => {
                e.stopPropagation();
                setDeleteTarget(p);
              } : undefined}
            />
          ))}
        </div>
      )}

      {/* Modal Detail (dengan tab Varian + BOM) */}
      {detailProduct && !editProduct && (
        <ProductDetailModal
          product={detailProduct}
          categories={categories}
          materials={materials}
          variants={variantMap[detailProduct.id!] || []} // <-- Tambahkan baris ini
          onClose={() => setDetailProduct(null)}
          onEdit={canWrite ? () => {
            setEditProduct(detailProduct);
            setDetailProduct(null);
          } : undefined}
          onVariantChange={handleVariantChange}
        />
      )}

      {/* Modal Form Tambah/Edit */}
      {editProduct && (
        <ProductFormModal
          initial={editProduct === "new" ? undefined : editProduct}
          categories={categories}
          onClose={() => setEditProduct(null)}
          onSave={handleSave}
        />
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Hapus Produk?</h3>
                <p className="text-xs text-muted-foreground">
                  Tindakan ini tidak bisa dibatalkan
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Produk{" "}
              <strong className="text-foreground">{deleteTarget.nama}</strong> (
              {deleteTarget.kode}) beserta seluruh varian dan BOM-nya akan
              dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{" "}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
