"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getProducts,
  getProductVariants,
  createWarehouseTransfer,
  type Product,
  type ProductVariant,
  hitungVariantStokStatus,
} from "@/lib/firestore";
import { Pagination } from "@/components/ui/Pagination";
import {
  Search,
  Loader2,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Package,
  Plus,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { cn } from "@/lib/utils";
import { useRBAC } from "@/hooks/useRBAC";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ErrorModal } from "@/components/ui/ErrorModal";

interface FlatVariant {
  productId: string;
  productName: string;
  productKode: string;
  variantId: string;
  warna: string;
  kodeHex: string;
  ukuran: string;
  stokBesar: number;
  stokPacking: number;
  stokMin: number;
}

export default function MasterProdukJadiPage() {
  const [flatVariants, setFlatVariants] = useState<FlatVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");

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

  // Transfer Modal State
  const [transferTarget, setTransferTarget] = useState<FlatVariant | null>(null);
  const [transferJumlah, setTransferJumlah] = useState<number>(0);
  const [transferCatatan, setTransferCatatan] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  const [currentUserId, setCurrentUserId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { can } = useRBAC();
  const canTransfer = can(["admin", "kepalaGudang"]);
  const canCreateWO = can(["admin", "kepalaTimProduksi"]);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setCurrentUserId(auth.currentUser.uid);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterWarehouse]);

  async function loadData() {
    setLoading(true);
    try {
      const products = await getProducts();
      const variantPromises = products.map(async (p) => {
        const vars = await getProductVariants(p.id!);
        return vars.map((v) => ({
          productId: p.id!,
          productName: p.nama,
          productKode: p.kode,
          variantId: v.id!,
          warna: v.namaWarna,
          kodeHex: v.kodeHex,
          ukuran: v.ukuran,
          stokBesar: v.stokJadi ?? 0,
          stokPacking: v.stokGudangPacking ?? 0,
          stokMin: v.stokMin ?? 20,
        }));
      });
      const resolved = await Promise.all(variantPromises);
      setFlatVariants(resolved.flat());
    } catch (e: any) {
      setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal memuat data produk jadi. Periksa koneksi internet Anda." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return flatVariants.filter((v) => {
      const q = search.toLowerCase();
      const matchSearch =
        v.productName.toLowerCase().includes(q) ||
        v.productKode.toLowerCase().includes(q) ||
        v.warna.toLowerCase().includes(q);

      const status = hitungVariantStokStatus(v.stokPacking, v.stokMin);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "aman" && status === "aman") ||
        (filterStatus === "rendah" && status === "rendah") ||
        (filterStatus === "habis" && status === "habis");

      const matchWarehouse =
        filterWarehouse === "all" ||
        (filterWarehouse === "besar" && v.stokBesar > 0) ||
        (filterWarehouse === "packing" && v.stokPacking > 0) ||
        (filterWarehouse === "keduanya_kosong" && v.stokBesar === 0 && v.stokPacking === 0);

      return matchSearch && matchStatus && matchWarehouse;
    });
  }, [flatVariants, search, filterStatus, filterWarehouse]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferTarget) return;
    if (transferJumlah <= 0) {
      setTransferError("Jumlah transfer harus lebih besar dari 0");
      return;
    }
    if (transferJumlah > transferTarget.stokBesar) {
      setTransferError("Jumlah transfer melebihi stok Gudang Besar");
      return;
    }

    setTransferring(true);
    setTransferError("");

    try {
      await createWarehouseTransfer({
        nomorTransfer: `TRF-${Date.now().toString().slice(-6)}`,
        productId: transferTarget.productId,
        productName: transferTarget.productName,
        variantId: transferTarget.variantId,
        warna: transferTarget.warna,
        ukuran: transferTarget.ukuran,
        jumlah: transferJumlah,
        tanggalTransfer: new Date().toISOString().slice(0, 10),
        catatan: transferCatatan || "Transfer cepat dari Master Produk Jadi",
        dibuatOleh: currentUserId || "Sistem",
      });

      await fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendToAll: true,
          title: "📦 Info Transfer Gudang",
          body: `${transferJumlah} pcs produk ${transferTarget.productName} varian ${transferTarget.warna} dikirim ke Gudang Packing.`,
          link: "/persediaan/transfer",
        }),
      });

     const sisaStokBesar = transferTarget.stokBesar - transferJumlah;
      if (sisaStokBesar <= transferTarget.stokMin) {
        await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sendToAll: true,
            title: "⚠️ Stok Gudang Besar Menipis!",
            body: `Setelah transfer, stok ${transferTarget.productName} di Gudang Besar tersisa ${sisaStokBesar} pcs.`,
            link: "/persediaan/produk-jadi",
          }),
        });
      }

      // 4. Kode asli Anda untuk mereset form dan memuat ulang data
      setSuccessPopup({
        isOpen: true,
        message: `Transfer ${transferJumlah} pcs ${transferTarget.productName} (${transferTarget.warna}) ke Gudang Packing berhasil!`,
      });

      setTransferTarget(null);
      setTransferJumlah(0);
      setTransferCatatan("");
      await loadData();
    } catch (err: any) {
      setErrorPopup({ isOpen: true, message: err?.message ?? "Gagal memproses transfer produk. Coba lagi." });
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-1 flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama produk, kode, atau warna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          >
            <option value="all">Semua Status Packing</option>
            <option value="aman">Status: Aman</option>
            <option value="rendah">Status: Hampir Habis</option>
            <option value="habis">Status: Habis</option>
          </select>

          {/* Gudang Filter */}
          <select
            value={filterWarehouse}
            onChange={(e) => setFilterWarehouse(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          >
            <option value="all">Semua Stok Gudang</option>
            <option value="besar">Ada Stok di Gudang Besar</option>
            <option value="packing">Ada Stok di Gudang Packing</option>
            <option value="keduanya_kosong">Keduanya Kosong</option>
          </select>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Segarkan
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
            <p className="text-sm text-muted-foreground">
              Memuat data produk jadi...
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3">Produk</th>
                  <th className="px-5 py-3">Warna & Ukuran</th>
                  <th className="px-5 py-3 text-right">Stok Gudang Besar</th>
                  <th className="px-5 py-3 text-right">Stok Gudang Packing</th>
                  <th className="px-5 py-3 text-center">Batas Minimum</th>
                  <th className="px-5 py-3 text-center">Status Packing</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground text-xs"
                    >
                      Tidak ada produk jadi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((v) => {
                    const status = hitungVariantStokStatus(
                      v.stokPacking,
                      v.stokMin
                    );
                    const statusLabel =
                      status === "habis"
                        ? "Habis"
                        : status === "rendah"
                        ? "Hampir Habis"
                        : "Aman";
                    const statusClass =
                      status === "habis"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : status === "rendah"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";

                    return (
                      <tr
                        key={v.variantId}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-foreground">
                              {v.productName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {v.productKode}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-border/50 flex-shrink-0"
                              style={{ backgroundColor: v.kodeHex }}
                              title={v.warna}
                            />
                            <div>
                              <p className="text-xs font-medium">{v.warna}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Ukuran: {v.ukuran}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-medium">
                          <span
                            className={cn(
                              v.stokBesar === 0
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {v.stokBesar.toLocaleString("id-ID")} pcs
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-medium">
                          <span
                            className={cn(
                              v.stokPacking === 0
                                ? "text-red-500 font-semibold"
                                : "text-foreground"
                            )}
                          >
                            {v.stokPacking.toLocaleString("id-ID")} pcs
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center font-mono text-muted-foreground text-xs">
                          {v.stokMin} pcs
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                              statusClass
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Transfer Button */}
                            {canTransfer && (
                              <button
                                onClick={() => {
                                  setTransferTarget(v);
                                  setTransferJumlah(
                                    Math.min(
                                      v.stokMin - v.stokPacking,
                                      v.stokBesar
                                    ) > 0
                                      ? Math.min(
                                          v.stokMin - v.stokPacking,
                                          v.stokBesar
                                        )
                                      : 1
                                  );
                                }}
                                disabled={v.stokBesar <= 0}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                                title="Transfer dari Gudang Besar ke Packing"
                              >
                                <ArrowLeftRight className="h-3 w-3" />
                                Transfer
                              </button>
                            )}

                            {/* Create WO Link */}
                            {canCreateWO && (
                              <Link
                                href={`/produksi/work-order?productId=${
                                  v.productId
                                }&variantId=${v.variantId}&jumlah=${
                                  v.stokMin * 3
                                }`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#003247] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#004a6e] transition-colors"
                                title="Buat Work Order Produksi Baru"
                              >
                              <ClipboardList className="h-3 w-3" />
                              WO
                            </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Transfer Dialog */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold">Proses Transfer Stok</h3>
              <button
                onClick={() => setTransferTarget(null)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="p-6 space-y-4">
                {/* Product details */}
                <div className="rounded-xl bg-muted/40 p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produk:</span>
                    <span className="font-semibold text-right">
                      {transferTarget.productName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Varian / Ukuran:
                    </span>
                    <span className="font-medium text-right">
                      {transferTarget.warna} · {transferTarget.ukuran}
                    </span>
                  </div>
                  <hr className="border-border my-1.5" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stok Gudang Besar:
                    </span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {transferTarget.stokBesar} pcs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stok Gudang Packing:
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {transferTarget.stokPacking} pcs (min.{" "}
                      {transferTarget.stokMin})
                    </span>
                  </div>
                </div>

                {/* Input jumlah */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Jumlah Transfer (pcs){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={transferTarget.stokBesar}
                    value={transferJumlah}
                    onChange={(e) =>
                      setTransferJumlah(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Maksimum transfer: {transferTarget.stokBesar} pcs.
                  </p>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Catatan
                  </label>
                  <textarea
                    rows={2}
                    value={transferCatatan}
                    onChange={(e) => setTransferCatatan(e.target.value)}
                    placeholder="Tulis catatan transfer jika ada..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 resize-none"
                  />
                </div>

                {transferError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{transferError}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setTransferTarget(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
                  disabled={transferring}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] disabled:opacity-60"
                >
                  {transferring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Kirim Transfer
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
