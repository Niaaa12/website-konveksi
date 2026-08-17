"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTahapProduksiSummary,
  type TahapSummary,
  URUTAN_TAHAP,
} from "@/lib/firestore";

import { cn } from "@/lib/utils";
import {
  Loader2,
  AlertTriangle,
  ChevronRight,
  Scissors,
  Shirt,
  Settings2,
  Wrench,
  Package,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const TAHAP_ICON: Record<string, React.ElementType> = {
  potong: Scissors,
  jahit: Shirt,
  obras: Settings2,
  finishing: Wrench,
  packing: Package,
};

export function DashboardTahapProduksiSummary() {
  const {
    user,
    isAdmin,
    isManajer,
    isProduksi,
    isGudang,
    isPICProduksi,
    loading: authLoading,
  } = useAuth();
  const [data, setData] = useState<TahapSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTahapProduksiSummary()
      .then(setData)
      .catch((e) => console.error("getTahapProduksiSummary:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  const totalMasalah = data.reduce((s, t) => s + t.jumlahWOMasalah, 0);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Alur Tahap Produksi</h2>
          {totalMasalah > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
              <AlertTriangle className="h-2.5 w-2.5" /> {totalMasalah} kendala
            </span>
          )}
        </div>
        {(isAdmin || isProduksi) && (
          <Link
            href="/produksi/work-order"
            className="text-xs text-[#003247] hover:underline flex items-center gap-0.5"
          >
            Detail <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Alur tahap — horizontal di desktop, vertikal di mobile */}
      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
        {URUTAN_TAHAP.map((tahapId, idx) => {
          const tahap = data.find((d) => d.tahapId === tahapId);
          if (!tahap) return null;

          const Icon = TAHAP_ICON[tahapId] ?? Package;
          const pct =
            tahap.totalMasuk > 0
              ? Math.round((tahap.totalSelesai / tahap.totalMasuk) * 100)
              : 0;
          const adaMasalah = tahap.jumlahWOMasalah > 0;
          const isBottleneck = tahap.jumlahWO > 3; // lebih dari 3 WO numpuk = bottleneck

          return (
            <div
              key={tahapId}
              className={cn(
                "flex-1 px-4 py-3 relative",
                adaMasalah && "bg-red-50/50 dark:bg-red-950/10"
              )}
            >
              {/* Nomor urut */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0",
                    adaMasalah
                      ? "bg-red-500"
                      : isBottleneck
                        ? "bg-amber-500"
                        : "bg-[#003247]"
                  )}
                >
                  {idx + 1}
                </span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">
                  {tahap.labelPendek}
                </span>
                {adaMasalah && (
                  <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Jumlah WO di tahap ini */}
              <p className="text-xl font-bold leading-none">
                {tahap.jumlahWO}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  WO
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
                sedang berlangsung
              </p>

              {/* Progress output */}
              {tahap.totalMasuk > 0 && (
                <div className="space-y-1">
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        adaMasalah ? "bg-red-500" : "bg-[#003247]"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>
                      {tahap.totalSelesai.toLocaleString("id-ID")} selesai
                    </span>
                    <span>{pct}%</span>
                  </div>
                </div>
              )}

              {/* Badge masalah */}
              {adaMasalah && (
                <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-1.5">
                  {tahap.jumlahWOMasalah} WO ada kendala
                </p>
              )}

              {/* Badge bottleneck */}
              {isBottleneck && !adaMasalah && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1.5">
                  Antrian padat
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: total cacat hari ini */}
      {data.some((t) => t.totalCacat > 0) && (
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Total cacat/reject semua tahap
          </span>
          <span className="text-[10px] font-semibold text-red-600">
            {data.reduce((s, t) => s + t.totalCacat, 0).toLocaleString("id-ID")}{" "}
            pcs
          </span>
        </div>
      )}
    </div>
  );
}
