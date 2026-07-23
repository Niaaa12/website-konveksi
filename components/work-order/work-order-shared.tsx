import { cn } from "@/lib/utils";
import type { WoStatus, WoPrioritas, TahapId, TahapStatus } from "@/lib/firestore";
import { Calendar, PlayCircle, TimerOff, CheckCircle2, X, Clock, RefreshCw, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI STATUS & PRIORITAS — Work Order
// Satu sumber kebenaran untuk warna/label status & prioritas Work Order.
// Dipakai di: halaman Work Order, halaman Jadwal Produksi, dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_CFG: Record<
  WoStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  dijadwalkan: {
    label: "Dijadwalkan",
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
    border: "border-slate-300",
    dot: "bg-slate-400",
    icon: Calendar,
  },
  berjalan: {
    label: "Berjalan",
    color: "text-emerald-700",
    bg: "bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400",
    border: "border-emerald-400",
    dot: "bg-emerald-500",
    icon: PlayCircle,
  },
  tertunda: {
    label: "Tertunda",
    color: "text-amber-700",
    bg: "bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400",
    border: "border-amber-400",
    dot: "bg-amber-500",
    icon: TimerOff,
  },
  selesai: {
    label: "Selesai",
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400",
    border: "border-blue-400",
    dot: "bg-blue-500",
    icon: CheckCircle2,
  },
  batal: {
    label: "Batal",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/40 dark:text-red-400",
    border: "border-red-300",
    dot: "bg-red-400",
    icon: X,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI STATUS TAHAP PRODUKSI
// Satu sumber kebenaran — dipakai di:
//   • halaman Progress PIC (app/progress/page.tsx)
//   • komponen TahapProduksiPanel (components/tahapproduksi/TahapProduksiPanel.tsx)
//   • tabel Work Order (kolom Tahap Saat Ini)
// ─────────────────────────────────────────────────────────────────────────────

export const TAHAP_STATUS_CFG: Record<
  TahapStatus,
  {
    label: string;
    warna: string;
    bg: string;
    dot: string;
    icon: React.ElementType;
  }
> = {
  belum_mulai: {
    label: "Belum Mulai",
    warna: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
    dot: "bg-slate-300",
    icon: Clock,
  },
  berlangsung: {
    label: "Berlangsung",
    warna: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/40",
    dot: "bg-blue-500",
    icon: RefreshCw,
  },
  selesai: {
    label: "Selesai",
    warna: "text-emerald-700",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  ada_masalah: {
    label: "Ada Masalah",
    warna: "text-red-700",
    bg: "bg-red-100 dark:bg-red-900/40",
    dot: "bg-red-500",
    icon: AlertTriangle,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI LABEL TAHAP (nama human-readable per TahapId)
// Dipakai di kolom "Tahap Saat Ini" tabel Work Order.
// ─────────────────────────────────────────────────────────────────────────────

export const TAHAP_LABEL: Record<TahapId, { label: string; labelPendek: string }> = {
  potong:    { label: "Pemotongan Kain",  labelPendek: "Potong"    },
  jahit:     { label: "Penjahitan",       labelPendek: "Jahit"     },
  obras:     { label: "Obras",            labelPendek: "Obras"     },
  finishing: { label: "Finishing & QC",   labelPendek: "Finishing" },
  packing:   { label: "Packing",          labelPendek: "Packing"   },
};

export const PRIORITAS_CFG: Record<
  WoPrioritas,
  { label: string; color: string }
> = {
  rendah: { label: "Rendah", color: "text-gray-500" },
  normal: { label: "Normal", color: "text-blue-600" },
  tinggi: { label: "Tinggi", color: "text-red-600 font-semibold" },
};

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN BADGE & PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: WoStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        cfg.bg
      )}
    >
      <Icon className="h-2.5 w-2.5" /> {cfg.label}
    </span>
  );
}

/**
 * Badge untuk menampilkan tahap produksi aktif berdasarkan `TahapId` dari Firestore.
 * Menggunakan TAHAP_LABEL untuk nama tahap yang ditampilkan.
 */
export function TahapBadge({ tahap }: { tahap?: TahapId | string }) {
  if (!tahap)
    return <span className="text-[10px] text-muted-foreground">—</span>;

  const label = TAHAP_LABEL[tahap as TahapId];
  if (!label)
    return <span className="text-[10px] text-muted-foreground">{tahap}</span>;

  const colorMap: Record<TahapId, string> = {
    potong:    "bg-sky-100 text-sky-700",
    jahit:     "bg-green-100 text-green-700",
    obras:     "bg-orange-100 text-orange-700",
    finishing: "bg-purple-100 text-purple-700",
    packing:   "bg-pink-100 text-pink-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        colorMap[tahap as TahapId] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label.labelPendek}
    </span>
  );
}

export function PriorBadge({ prioritas }: { prioritas: WoPrioritas }) {
  const cfg = PRIORITAS_CFG[prioritas];
  return <span className={cn("text-[10px]", cfg.color)}>{cfg.label}</span>;
}

export function ProgressBar({
  done,
  target,
  cacat,
  progress,
}: {
  done: number;
  target: number;
  cacat: number;
  progress?: number; // progress tetap berbasis tahap (0–100%)
}) {
  // Jika progress tahap diberikan, pakai itu. Kalau tidak, hitung dari done/target.
  const pct =
    progress != null
      ? progress
      : target > 0
      ? Math.min(100, Math.round((done / target) * 100))
      : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">
          {done.toLocaleString("id-ID")} / {target.toLocaleString("id-ID")} pcs
        </span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[#003247] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {cacat > 0 && (
        <p className="text-[10px] text-red-500">
          {cacat} unit cacat
        </p>
      )}
    </div>
  );
}
