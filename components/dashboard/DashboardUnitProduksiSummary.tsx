"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProductionUnitsSummary,
  type UnitKategoriSummary,
} from "@/lib/firestore";
import { getAuth } from "firebase/auth";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Shirt,
  Settings2,
  Scissors,
  Wrench,
  ClipboardCheck,
  Factory,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ICON_MAP: Record<string, React.ElementType> = {
  jahit: Shirt,
  obras: Settings2,
  potong: Scissors,
  finishing: Wrench,
  qc: ClipboardCheck,
  lainnya: Factory,
};

export function DashboardUnitProduksiSummary() {
  const {
    user,
    isAdmin,
    isManajer,
    isProduksi,
    isGudang,
    isPICProduksi,
    loading: authLoading,
  } = useAuth();
  const [summary, setSummary] = useState<UnitKategoriSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProductionUnitsSummary();
        setSummary(data);
      } catch (e) {
        console.error("getProductionUnitsSummary:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summary.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <h2 className="text-sm font-semibold">Status Unit Produksi</h2>
        {(isAdmin || isProduksi) && (
          <Link
            href="/unitproduksi"
            className="text-xs text-[#003247] hover:underline"
          >
            Lihat semua →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border">
        {summary.map((s) => {
          const Icon = ICON_MAP[s.kategori] ?? Factory;
          const efisiensiColor =
            s.rataEfisiensi >= 85
              ? "text-emerald-600"
              : s.rataEfisiensi >= 60
                ? "text-amber-600"
                : "text-red-500";
          return (
            <Link
              key={s.kategori}
              href={`/unitproduksi?kategori=${s.kategori}`}
              className="bg-card p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {s.aktif}
                <span className="text-muted-foreground font-normal text-sm">
                  /{s.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mb-1.5">
                unit aktif
              </p>
              <p className={cn("text-[10px] font-medium", efisiensiColor)}>
                Efisiensi rata² {s.rataEfisiensi}%
              </p>
              {s.maintenance > 0 && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {s.maintenance} maintenance
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
