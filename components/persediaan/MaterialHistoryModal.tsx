"use client";

import { useEffect, useState } from "react";
import {
  getStockTransactions,
  type StockTransaction,
  type Material,
} from "@/lib/firestore";
import { Loader2, X, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase"; // Pastikan path db firebase sesuai
import { doc, getDoc } from "firebase/firestore";

export function MaterialHistoryModal({
  material,
  onClose,
}: {
  material: Material | any;
  onClose: () => void;
}) {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk menyimpan cache Nama User dan Nomor WO agar tidak bolak-balik fetch
  const [woNames, setWoNames] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTx() {
      if (!material.id) return;
      setLoading(true);
      try {
        const data = await getStockTransactions(material.id, 50);
        setTransactions(data);

        // Kumpulkan ID WO dan User yang unik untuk ditarik datanya sekaligus
        const woIds = Array.from(
          new Set(
            data
              .filter((tx) => tx.refTipe === "WO" && tx.refId)
              .map((tx) => tx.refId)
          )
        );
        const userIds = Array.from(
          new Set(
            data.filter((tx) => tx.dilakukanOleh).map((tx) => tx.dilakukanOleh)
          )
        );

        // Fetch Nomor WO
        const woMap: Record<string, string> = {};
        for (const id of woIds) {
          try {
            const woDoc = await getDoc(doc(db, "workOrders", id));
            if (woDoc.exists()) {
              woMap[id] = woDoc.data().nomor || id.slice(0, 8);
            } else {
              woMap[id] = id.slice(0, 8);
            }
          } catch {
            woMap[id] = id.slice(0, 8);
          }
        }
        setWoNames(woMap);

        // Fetch Nama User / PIC
        const userMap: Record<string, string> = {};
        for (const uid of userIds) {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              userMap[uid] =
                userDoc.data().nama || userDoc.data().email || uid.slice(0, 8);
            } else {
              userMap[uid] = uid; // Jika string-nya bukan UID (misal tertulis "Sistem" atau nama langsung)
            }
          } catch {
            userMap[uid] = uid;
          }
        }
        setUserNames(userMap);
      } catch (error) {
        console.error("Gagal memuat riwayat transaksi:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTx();
  }, [material.id]);

  const satuanText = material.satuan || material.satuanBahan || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">
              Riwayat Transaksi Bahan Baku
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {material.nama} ({material.kode || material.id}) · Stok Saat Ini:{" "}
              {material.stokAktual ?? material.stok} {satuanText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
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
                    // Ambil nomor WO yang sudah diterjemahkan, atau fallback ke potongan string jika belum ada
                    const displayRefId =
                      tx.refTipe === "WO" && woNames[tx.refId]
                        ? woNames[tx.refId]
                        : tx.refId
                        ? tx.refId.slice(0, 8) + "..."
                        : "—";

                    // Ambil nama user yang sudah diterjemahkan dari koleksi users
                    const displayName =
                      userNames[tx.dilakukanOleh] ||
                      tx.dilakukanOleh ||
                      "Sistem";

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded-full flex-shrink-0",
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
                              <p className="text-[11px] font-medium text-foreground">
                                Ref:{" "}
                                <span className="font-mono text-primary">
                                  {displayRefId}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right text-xs font-bold whitespace-nowrap",
                            isMasuk ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {isMasuk ? `+${tx.jumlah}` : `-${tx.jumlah}`}{" "}
                          {satuanText}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {tx.stokSebelum} ➔{" "}
                          <span className="text-foreground font-semibold">
                            {tx.stokSesudah}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-foreground">
                            {tx.catatan || "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Oleh:{" "}
                            <span className="font-medium text-foreground">
                              {displayName}
                            </span>
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
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
