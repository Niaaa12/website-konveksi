"use client";

import { useEffect, useState } from "react";
import {
  listenTahapProduksi,
  TAHAP_CONFIG,
  URUTAN_TAHAP,
  type TahapProduksi,
} from "@/lib/firestore";
import { TAHAP_STATUS_CFG } from "@/components/work-order/work-order-shared";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN UTAMA: TahapProduksiPanel
// Dipakai di dalam modal detail Work Order (WODetailModal) untuk manajer.
// Data real-time via Firestore listener — otomatis update tanpa refresh.
// Konfigurasi visual (TAHAP_STATUS_CFG) diimpor dari work-order-shared
// agar konsisten dengan halaman Progress PIC.
// ─────────────────────────────────────────────────────────────────────────────

export function TahapProduksiPanel({
  woId,
  jumlahTarget,
}: {
  woId: string;
  jumlahTarget: number;
}) {
  const [tahapList, setTahapList] = useState<TahapProduksi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener — update otomatis saat PIC menyimpan progress
    const unsub = listenTahapProduksi(woId, (data) => {
      setTahapList(data);
      setLoading(false);
    });
    return unsub;
  }, [woId]);

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (tahapList.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Tahap produksi belum diinisialisasi
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Akan muncul otomatis setelah WO diaktifkan
        </p>
      </div>
    );

  const tahapSelesai = tahapList.filter((t) => t.status === "selesai").length;
  const adaMasalah = tahapList.filter((t) => t.status === "ada_masalah");
  const outputFinishing =
    tahapList.find((t) => t.tahap === "finishing")?.jumlahSelesai ?? 0;
  const pctOutput =
    jumlahTarget > 0 ? Math.round((outputFinishing / jumlahTarget) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Ringkasan ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <p className="text-lg font-bold">
            {tahapSelesai}
            <span className="text-muted-foreground text-sm font-normal">
              /{URUTAN_TAHAP.length}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">Tahap selesai</p>
        </div>
        <div
          className={cn(
            "rounded-xl p-3 text-center",
            adaMasalah.length > 0
              ? "bg-red-50 dark:bg-red-950/30"
              : "bg-muted/40"
          )}
        >
          <p
            className={cn(
              "text-lg font-bold",
              adaMasalah.length > 0 && "text-red-600 dark:text-red-400"
            )}
          >
            {adaMasalah.length}
          </p>
          <p
            className={cn(
              "text-[10px]",
              adaMasalah.length > 0 ? "text-red-500" : "text-muted-foreground"
            )}
          >
            Ada masalah
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <p className="text-lg font-bold">{pctOutput}%</p>
          <p className="text-[10px] text-muted-foreground">Output packing</p>
        </div>
      </div>

      {/* ── Alert kendala (jika ada) ── */}
      {adaMasalah.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              Kendala di {adaMasalah.length} tahap
            </p>
          </div>
          {adaMasalah.map(
            (t) =>
              t.catatanKendala && (
                <p
                  key={t.tahap}
                  className="text-xs text-red-600 dark:text-red-400 pl-5"
                >
                  <span className="font-medium">
                    {TAHAP_CONFIG[t.tahap].labelPendek}:
                  </span>{" "}
                  {t.catatanKendala}
                </p>
              )
          )}
        </div>
      )}

      {/* ── Tabel per tahap ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <div className="col-span-3">Tahap</div>
          <div className="col-span-2 text-right">Masuk</div>
          <div className="col-span-2 text-right">Selesai</div>
          <div className="col-span-2 text-right">Cacat</div>
          <div className="col-span-3 text-right">Status</div>
        </div>

        {/* Baris per tahap */}
        {URUTAN_TAHAP.map((tahapId) => {
          const tahap = tahapList.find((t) => t.tahap === tahapId);
          if (!tahap) return null;

          const cfg = TAHAP_STATUS_CFG[tahap.status];
          const Icon = cfg.icon;
          const pct =
            tahap.jumlahMasuk > 0
              ? Math.round((tahap.jumlahSelesai / tahap.jumlahMasuk) * 100)
              : 0;

          return (
            <div
              key={tahapId}
              className={cn(
                "border-b border-border last:border-0",
                tahap.status === "belum_mulai" && "opacity-40",
                tahap.status === "ada_masalah" &&
                  "bg-red-50/50 dark:bg-red-950/10"
              )}
            >
              {/* Baris data */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-3 flex items-center gap-1.5">
                  <Icon
                    className={cn("h-3.5 w-3.5 flex-shrink-0", cfg.warna)}
                  />
                  <span className="text-xs font-medium">
                    {TAHAP_CONFIG[tahapId].labelPendek}
                  </span>
                </div>
                <div className="col-span-2 text-right text-xs text-muted-foreground">
                  {tahap.jumlahMasuk > 0
                    ? tahap.jumlahMasuk.toLocaleString("id-ID")
                    : "—"}
                </div>
                <div
                  className={cn(
                    "col-span-2 text-right text-xs font-medium",
                    tahap.jumlahSelesai > 0
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {tahap.jumlahSelesai > 0
                    ? tahap.jumlahSelesai.toLocaleString("id-ID")
                    : "—"}
                </div>
                <div
                  className={cn(
                    "col-span-2 text-right text-xs",
                    tahap.jumlahCacat > 0
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {tahap.jumlahCacat > 0
                    ? tahap.jumlahCacat.toLocaleString("id-ID")
                    : "—"}
                </div>
                <div className="col-span-3 flex justify-end">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      cfg.bg,
                      cfg.warna
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Progress bar tipis (hanya tahap yang sudah mulai) */}
              {tahap.status !== "belum_mulai" && tahap.jumlahMasuk > 0 && (
                <div className="px-4 pb-2">
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        tahap.status === "selesai"
                          ? "bg-emerald-500"
                          : tahap.status === "ada_masalah"
                          ? "bg-red-500"
                          : "bg-blue-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Catatan kendala */}
              {tahap.catatanKendala && tahap.status !== "selesai" && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-2.5 py-1.5">
                    {tahap.catatanKendala}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keterangan real-time */}
      <p className="text-[10px] text-muted-foreground text-right">
        Data real-time · diperbarui otomatis saat PIC menyimpan progress
      </p>
    </div>
  );
}
