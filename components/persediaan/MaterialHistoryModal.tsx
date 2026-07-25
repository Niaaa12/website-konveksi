"use client";

import { useEffect, useState } from "react";
import {
  getStockTransactions,
  type StockTransaction,
  type Material,
} from "@/lib/firestore";
import {
  Loader2,
  X,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MaterialHistoryModal({
  material,
  onClose,
}: {
  material:
    | Material
    | { id: string; nama: string; satuan: string; stok: number };
  onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTx() {
      if (!material.id) return;
      setLoading(true);
      try {
        const data = await getStockTransactions(material.id, 50);
        setTransactions(data);
      } catch (error) {
        console.error("Gagal memuat riwayat transaksi:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTx();
  }, [material.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              Riwayat Transaksi Bahan Baku
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {material.nama} (
              {"kode" in material ? material.kode : material.id}) · Stok Saat
              Ini:{" "}
              {"stokAktual" in material ? material.stokAktual : material.stok}{" "}
              {material.satuan}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#003247]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              Belum ada riwayat transaksi untuk bahan baku ini.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground">
                    <th className="px-4 py-2.5 text-left">Jenis / Ref</th>
                    <th className="px-4 py-2.5 text-right">Jumlah</th>
                    <th className="px-4 py-2.5 text-right">
                      Stok (Sebelum ➔ Sesudah)
                    </th>
                    <th className="px-4 py-2.5 text-left">Catatan & Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => {
                    const isMasuk = tx.jenis === "masuk";
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded-full",
                                isMasuk
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              )}
                            >
                              {isMasuk ? (
                                <ArrowDownRight className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div>
                              <p className="text-xs font-semibold capitalize">
                                {tx.jenis} ({tx.refTipe})
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                ID: {tx.refId.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right text-xs font-bold",
                            isMasuk ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {isMasuk ? `+${tx.jumlah}` : `-${tx.jumlah}`}{" "}
                          {material.satuan}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">
                          {tx.stokSebelum} ➔{" "}
                          <span className="text-foreground font-semibold">
                            {tx.stokSesudah}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-foreground">
                            {tx.catatan || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Oleh: {tx.dilakukanOleh}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-3 bg-muted/20">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted/50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
