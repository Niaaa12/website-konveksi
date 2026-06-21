"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE — ringkasan stok kritis, dihitung dari data Material yang sama
// dengan yang dipakai halaman Bahan Baku (lib/firestore.ts → getMaterials()).
// ─────────────────────────────────────────────────────────────────────────────

export interface StokKritisSummary {
  stokHabis: number;
  stokKritis: number;
}

/** Hitung ringkasan stok kritis dari data material — dipanggil di mana saja yang sudah punya `data` material */
export function hitungStokKritis(
  materials: { stok: number; stokMin: number }[]
): StokKritisSummary {
  return {
    stokHabis: materials.filter((m) => m.stok <= 0).length,
    stokKritis: materials.filter((m) => m.stok > 0 && m.stok <= m.stokMin)
      .length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIAN 1 — Versi penuh (dipakai di halaman Bahan Baku, tema terang)
// ─────────────────────────────────────────────────────────────────────────────

export function StokKritisAlertFull({
  stokKritis,
  stokHabis,
}: StokKritisSummary) {
  if (stokKritis === 0 && stokHabis === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Perhatian Stok!
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
          {stokHabis > 0 && `${stokHabis} bahan habis. `}
          {stokKritis > 0 && `${stokKritis} bahan dalam kondisi kritis.`}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VARIAN 2 — Versi compact (dipakai di Sidebar, tema gelap)
// Struktur & class disamakan gayanya dengan potongan kode Bell yang dikirim,
// tapi datanya sekarang dinamis dan bisa diklik menuju halaman Bahan Baku.
// ─────────────────────────────────────────────────────────────────────────────

export function StokKritisAlertSidebar({
  stokKritis,
  stokHabis,
}: StokKritisSummary) {
  const total = stokKritis + stokHabis;
  if (total === 0) return null;

  return (
    <Link
      href="/bahan-baku"
      className="group m-3 block rounded-lg border border-red-900/50 bg-red-950/50 p-3 transition-colors hover:bg-red-950/70"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs font-medium text-red-300">
            Stok Kritis! ({total})
          </span>
        </div>
        <ChevronRight className="h-3 w-3 text-red-400/60 transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-1 text-[10px] text-red-400/80">
        {stokHabis > 0 && stokKritis > 0
          ? `${stokHabis} habis, ${stokKritis} hampir habis — perlu segera dipesan`
          : stokHabis > 0
          ? `${stokHabis} bahan baku habis — perlu segera dipesan`
          : `${stokKritis} bahan baku hampir habis — perlu segera dipesan`}
      </p>
    </Link>
  );
}
