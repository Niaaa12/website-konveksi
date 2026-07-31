"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getProducts,
  getProductVariants,
  getProductOutflows,
  createProductOutflow,
  type Product,
  type ProductVariant,
} from "@/lib/firestore";
import {
  Plus,
  Loader2,
  RefreshCw,
  Search,
  Package,
  Calendar,
  User,
  AlertTriangle,
  X,
  Check,
  Truck,
} from "lucide-react";
import { getAuth } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useRBAC } from "@/hooks/useRBAC";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ErrorModal } from "@/components/ui/ErrorModal";

export default function PengeluaranProdukPage() {
  const [outflows, setOutflows] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // State modal sukses
  const [successPopup, setSuccessPopup] = useState({
    isOpen: false,
    message: "",
  });

  // State modal error
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    message: "",
  });

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [jumlah, setJumlah] = useState<number>(0);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [pelanggan, setPelanggan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserNama, setCurrentUserNama] = useState("");

  const { can } = useRBAC();
  const canWrite = can(["admin", "kepalaGudang"]);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setCurrentUserId(auth.currentUser.uid);
      setCurrentUserNama(auth.currentUser.displayName ?? auth.currentUser.email ?? "Staf Packing");
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [listOut, listProds] = await Promise.all([
        getProductOutflows(),
        getProducts(undefined, true),
      ]);
      setOutflows(listOut);
      setProducts(listProds);
    } catch (e: any) {
      setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal memuat data pengeluaran. Periksa koneksi internet Anda." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Fetch variants when product changes
  useEffect(() => {
    if (!selectedProductId) {
      setVariants([]);
      setSelectedVariantId("");
      return;
    }
    setLoadingVariants(true);
    getProductVariants(selectedProductId)
      .then((v) => {
        setVariants(v);
        if (v.length > 0) setSelectedVariantId(v[0].id!);
      })
      .catch(() => setVariants([]))
      .finally(() => setLoadingVariants(false));
  }, [selectedProductId]);

  const selectedVariant = useMemo(() => {
    return variants.find((v) => v.id === selectedVariantId);
  }, [variants, selectedVariantId]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const filtered = useMemo(() => {
    return outflows.filter((o) => {
      const q = search.toLowerCase();
      return (
        o.nomorOutflow.toLowerCase().includes(q) ||
        o.productName.toLowerCase().includes(q) ||
        o.warna.toLowerCase().includes(q) ||
        (o.pelanggan && o.pelanggan.toLowerCase().includes(q)) ||
        (o.catatan && o.catatan.toLowerCase().includes(q))
      );
    });
  }, [outflows, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || !selectedVariantId || jumlah <= 0 || !pelanggan) {
      setError("Semua field wajib diisi dengan benar.");
      return;
    }
    if (selectedVariant && jumlah > (selectedVariant.stokGudangPacking ?? 0)) {
      setError(`Jumlah pengeluaran melebihi stok Gudang Packing (${selectedVariant.stokGudangPacking ?? 0} pcs tersedia).`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createProductOutflow({
        nomorOutflow: `OUT-${Date.now().toString().slice(-6)}`,
        productId: selectedProductId,
        productName: selectedProduct?.nama ?? "Produk",
        variantId: selectedVariantId,
        warna: selectedVariant?.namaWarna ?? "Warna",
        ukuran: selectedVariant?.ukuran ?? "All Size",
        jumlah: jumlah,
        tanggalOutflow: tanggal,
        pelanggan: pelanggan,
        catatan: catatan,
        dibuatOleh: currentUserNama,
      });

      setIsModalOpen(false);
      // Reset form
      setSelectedProductId("");
      setSelectedVariantId("");
      setJumlah(0);
      setTanggal(new Date().toISOString().slice(0, 10));
      setPelanggan("");
      setCatatan("");

      setSuccessPopup({
        isOpen: true,
        message: `Pengeluaran produk sebanyak ${jumlah} pcs berhasil dicatat!`,
      });

      await loadData();
    } catch (err: any) {
      setErrorPopup({ isOpen: true, message: err?.message ?? "Gagal memproses pengeluaran produk. Coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari log pengeluaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Segarkan
          </button>

          {canWrite && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Catat Pengeluaran
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
            <p className="text-sm text-muted-foreground">Memuat data pengeluaran...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3">No. Pengeluaran</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Pelanggan / Pesanan</th>
                  <th className="px-5 py-3">Produk</th>
                  <th className="px-5 py-3">Varian (Warna & Ukuran)</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                  <th className="px-5 py-3">Petugas Packing</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                      Tidak ada data log pengeluaran produk jadi.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-4 font-mono font-semibold text-xs text-[#003247]">
                        {o.nomorOutflow}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {o.tanggalOutflow}
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">
                        {o.pelanggan}
                      </td>
                      <td className="px-5 py-4">
                        {o.productName}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-border/50"
                            style={{ backgroundColor: o.kodeHex || "#ccc" }}
                          />
                          <span className="text-xs">
                            {o.warna} · <span className="text-[10px] text-muted-foreground">{o.ukuran}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-red-500">
                        -{o.jumlah.toLocaleString("id-ID")} pcs
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {o.dibuatOleh}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground max-w-xs truncate" title={o.catatan}>
                        {o.catatan || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Pengeluaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold">Catat Pengeluaran Produk Jadi</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Select Product */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Pilih Produk <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                    required
                  >
                    <option value="">-- Pilih Produk Jadi --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.kode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Variant */}
                {selectedProductId && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Pilih Varian Warna & Ukuran <span className="text-red-500">*</span>
                    </label>
                    {loadingVariants ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Memuat varian...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedVariantId}
                        onChange={(e) => setSelectedVariantId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                        required
                      >
                        <option value="">-- Pilih Varian --</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.namaWarna} · {v.ukuran} (Stok Gudang Packing: {v.stokGudangPacking ?? 0} pcs)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Current Stock Preview */}
                {selectedVariant && (
                  <div className="rounded-xl bg-muted/40 p-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stok Gudang Packing saat ini:</span>
                      <span className="font-mono font-bold text-red-500">
                        {selectedVariant.stokGudangPacking ?? 0} pcs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batas Minimum Stok Packing:</span>
                      <span className="font-mono text-muted-foreground">
                        {selectedVariant.stokMin ?? 20} pcs
                      </span>
                    </div>
                  </div>
                )}

                {/* Pelanggan / Pesanan */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Nama Pelanggan / No. Pesanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pelanggan}
                    onChange={(e) => setPelanggan(e.target.value)}
                    placeholder="Nama Pelanggan atau Kode Order..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                    required
                  />
                </div>

                {/* Input Jumlah & Tanggal */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Jumlah Keluar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={selectedVariant ? (selectedVariant.stokGudangPacking ?? 0) : undefined}
                      value={jumlah}
                      onChange={(e) => setJumlah(Math.max(0, Number(e.target.value)))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5">
                      Tanggal Keluar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                      required
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">Catatan</label>
                  <textarea
                    rows={2}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Tulis keterangan pengeluaran produk..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
                  disabled={saving}
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
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={successPopup.isOpen}
        message={successPopup.message}
        onClose={() => setSuccessPopup({ isOpen: false, message: "" })}
      />
      <ErrorModal
        isOpen={errorPopup.isOpen}
        message={errorPopup.message}
        onClose={() => setErrorPopup({ isOpen: false, message: "" })}
      />
    </div>
  );
}
