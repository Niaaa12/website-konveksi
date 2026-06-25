"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X, Check, AlertCircle, AlertTriangle } from "lucide-react";
import type {
  WorkOrder,
  WoStatus,
  WoPrioritas,
  Product,
  ProductionUnit,
  AppUser,
  ProductVariant,
} from "@/lib/firestore";
import { getProductVariants, hitungVariantStokStatus } from "@/lib/firestore";
import { STATUS_CFG } from "./work-order-shared";

export interface WOFormData {
  nomor: string;
  productId: string;
  variantId: string;
  jumlahTarget: number;
  status: WoStatus;
  prioritas: WoPrioritas;
  unitId: string;
  operatorId: string;
  tanggalMulai: string;
  tanggalTarget: string;
  catatan: string;
}

const EMPTY_WO: WOFormData = {
  nomor: "",
  productId: "",
  variantId: "",
  jumlahTarget: 0,
  status: "dijadwalkan",
  prioritas: "normal",
  unitId: "",
  operatorId: "",
  tanggalMulai: "",
  tanggalTarget: "",
  catatan: "",
};

// ─── Badge stok varian (inline, ringkas) ─────────────────────────────────────
function StokBadge({ stok, stokMin }: { stok: number; stokMin: number }) {
  const status = hitungVariantStokStatus(stok, stokMin);
  if (status === "habis")
    return <span className="text-[10px] font-medium text-red-600">Habis</span>;
  if (status === "rendah")
    return (
      <span className="text-[10px] font-medium text-amber-600">
        Hampir habis ({stok})
      </span>
    );
  return <span className="text-[10px] text-muted-foreground">{stok} pcs</span>;
}

export function WOFormModal({
  initial,
  products,
  units,
  operators,
  onClose,
  onSave,
}: {
  initial?: WorkOrder;
  products: Product[];
  units: ProductionUnit[];
  operators: AppUser[];
  onClose: () => void;
  onSave: (data: WOFormData, id?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<WOFormData>(
    initial
      ? {
          nomor: initial.nomor,
          productId: initial.productId,
          variantId: initial.variantId ?? "",
          jumlahTarget: initial.jumlahTarget,
          status: initial.status,
          prioritas: initial.prioritas,
          unitId: initial.unitId,
          operatorId: initial.operatorId ?? "",
          tanggalMulai: initial.tanggalMulai,
          tanggalTarget: initial.tanggalTarget,
          catatan: initial.catatan,
        }
      : { ...EMPTY_WO, nomor: `WO-${Date.now().toString().slice(-6)}` }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // State varian warna
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Fetch varian saat produk dipilih atau berubah
  useEffect(() => {
    if (!form.productId) {
      setVariants([]);
      setForm((p) => ({ ...p, variantId: "" }));
      return;
    }
    setLoadingVariants(true);
    getProductVariants(form.productId)
      .then((v) => {
        setVariants(v);
        // Kalau edit dan variantId sudah ada tapi tidak ada di daftar baru → reset
        if (form.variantId && !v.some((x) => x.id === form.variantId)) {
          setForm((p) => ({ ...p, variantId: "" }));
        }
      })
      .catch(() => setVariants([]))
      .finally(() => setLoadingVariants(false));
    // Sengaja hanya trigger saat productId berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId]);

  function set(k: keyof WOFormData, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // Varian yang dipilih saat ini
  const varianDipilih = variants.find((v) => v.id === form.variantId);
  const varianKritis = variants.filter(
    (v) => hitungVariantStokStatus(v.stokJadi, v.stokMin ?? 20) !== "aman"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.nomor ||
      !form.productId ||
      !form.unitId ||
      !form.tanggalMulai ||
      !form.tanggalTarget
    ) {
      setError("Nomor WO, produk, unit, dan tanggal wajib diisi.");
      return;
    }
    if (form.tanggalTarget < form.tanggalMulai) {
      setError("Tanggal target tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (form.jumlahTarget <= 0) {
      setError("Jumlah target harus lebih dari 0.");
      return;
    }
    // Varian wajib dipilih jika produk punya varian
    if (variants.length > 0 && !form.variantId) {
      setError("Pilih warna yang ingin diproduksi.");
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

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Work Order" : "Buat Work Order Baru"}
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
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{" "}
                {error}
              </div>
            )}

            {/* Nomor WO + Prioritas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Nomor WO <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nomor}
                  onChange={(e) => set("nomor", e.target.value)}
                  placeholder="WO-2505-006"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Prioritas
                </label>
                <select
                  value={form.prioritas}
                  onChange={(e) =>
                    set("prioritas", e.target.value as WoPrioritas)
                  }
                  className={inputClass}
                >
                  <option value="rendah">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="tinggi">Tinggi</option>
                </select>
              </div>
            </div>

            {/* Pilih Produk */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Produk <span className="text-red-500">*</span>
              </label>
              <select
                value={form.productId}
                onChange={(e) => {
                  // Reset variantId saat produk berganti
                  setForm((p) => ({
                    ...p,
                    productId: e.target.value,
                    variantId: "",
                  }));
                }}
                className={inputClass}
              >
                <option value="">Pilih produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode ? `${p.kode} — ${p.nama}` : p.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Warna — muncul setelah produk dipilih */}
            {form.productId && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium">
                    Warna yang Diproduksi
                    {variants.length > 0 && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  {loadingVariants && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>

                {loadingVariants ? (
                  <div className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                    Memuat varian warna...
                  </div>
                ) : variants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                    Produk ini belum memiliki varian warna — WO akan dibuat
                    tanpa pilihan warna spesifik. Tambahkan varian di halaman
                    Katalog Produk terlebih dahulu.
                  </div>
                ) : (
                  <>
                    {/* Alert varian kritis */}
                    {varianKritis.length > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          {varianKritis.map((v) => v.namaWarna).join(", ")} —
                          stok rendah/habis. Warna ini yang sebaiknya
                          diprioritaskan untuk diproduksi.
                        </p>
                      </div>
                    )}

                    {/* Grid pilih warna — visual dot + nama + stok */}
                    <div className="grid grid-cols-2 gap-2">
                      {variants.map((v) => {
                        const isSelected = form.variantId === v.id;
                        const stokStatus = hitungVariantStokStatus(
                          v.stokJadi,
                          v.stokMin ?? 20
                        );
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              set("variantId", isSelected ? "" : v.id!)
                            }
                            className={cn(
                              "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
                              isSelected
                                ? "border-[#003247] bg-[#003247]/5 ring-1 ring-[#003247]/30"
                                : stokStatus === "habis"
                                ? "border-red-200 bg-red-50/50 dark:bg-red-950/10 hover:border-red-300"
                                : stokStatus === "rendah"
                                ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 hover:border-amber-300"
                                : "border-border hover:bg-muted/40"
                            )}
                          >
                            {/* Dot warna */}
                            <span
                              className={cn(
                                "h-6 w-6 rounded-full flex-shrink-0 border-2",
                                isSelected
                                  ? "border-[#003247]"
                                  : "border-white dark:border-gray-700"
                              )}
                              style={{ backgroundColor: v.kodeHex }}
                            />
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "text-xs font-medium truncate leading-tight",
                                  isSelected
                                    ? "text-[#003247]"
                                    : "text-foreground"
                                )}
                              >
                                {v.namaWarna}
                              </p>
                              <div className="mt-0.5">
                                <StokBadge
                                  stok={v.stokJadi}
                                  stokMin={v.stokMin ?? 20}
                                />
                              </div>
                            </div>
                            {/* Centang kalau terpilih */}
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-[#003247] flex-shrink-0 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Preview warna yang dipilih */}
                    {varianDipilih && (
                      <div className="flex items-center gap-2 mt-2 rounded-xl bg-[#003247]/5 border border-[#003247]/20 px-3 py-2">
                        <span
                          className="h-4 w-4 rounded-full flex-shrink-0 border border-border/50"
                          style={{ backgroundColor: varianDipilih.kodeHex }}
                        />
                        <p className="text-xs text-[#003247] font-medium">
                          Dipilih: {varianDipilih.namaWarna}
                        </p>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Stok: {varianDipilih.stokJadi} pcs
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Unit Produksi + Operator */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Unit Produksi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unitId}
                  onChange={(e) => set("unitId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Operator / PIC
                </label>
                <select
                  value={form.operatorId}
                  onChange={(e) => set("operatorId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih operator</option>
                  {operators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jumlah Target */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Jumlah Target (pcs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.jumlahTarget}
                onChange={(e) => set("jumlahTarget", Number(e.target.value))}
                className={inputClass}
              />
              {/* Saran jumlah target berdasarkan stok varian yang dipilih */}
              {varianDipilih &&
                hitungVariantStokStatus(
                  varianDipilih.stokJadi,
                  varianDipilih.stokMin ?? 20
                ) !== "aman" && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    Stok {varianDipilih.namaWarna} saat ini{" "}
                    {varianDipilih.stokJadi} pcs (min.{" "}
                    {varianDipilih.stokMin ?? 20} pcs). Produksi setidaknya{" "}
                    {Math.max(
                      0,
                      (varianDipilih.stokMin ?? 20) -
                        varianDipilih.stokJadi +
                        50
                    )}{" "}
                    pcs untuk mengisi kembali.
                  </p>
                )}
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggalMulai}
                  onChange={(e) => set("tanggalMulai", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Target Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggalTarget}
                  onChange={(e) => set("tanggalTarget", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Status (hanya saat edit) */}
            {isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STATUS_CFG) as WoStatus[]).map((s) => {
                    const cfg = STATUS_CFG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("status", s)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all",
                          form.status === s
                            ? "border-[#003247] bg-[#003247]/5 ring-1 ring-[#003247]/30"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            form.status === s
                              ? "text-[#003247]"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            form.status === s ? "text-[#003247]" : ""
                          )}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catatan */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Catatan
              </label>
              <textarea
                value={form.catatan}
                onChange={(e) => set("catatan", e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className={cn(inputClass, "resize-none")}
              />
            </div>
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
              {isEdit ? "Simpan" : "Buat WO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
