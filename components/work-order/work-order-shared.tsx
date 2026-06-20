import { cn } from "@/lib/utils";
import type { WoStatus, WoPrioritas } from "@/lib/firestore";
import { Calendar, PlayCircle, TimerOff, CheckCircle2, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI STATUS & PRIORITAS
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

export function PriorBadge({ prioritas }: { prioritas: WoPrioritas }) {
  const cfg = PRIORITAS_CFG[prioritas];
  return <span className={cn("text-[10px]", cfg.color)}>{cfg.label}</span>;
}

export function ProgressBar({
  done,
  target,
  cacat,
}: {
  done: number;
  target: number;
  cacat: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const cacatPct =
    target > 0 ? Math.min(100, Math.round((cacat / target) * 100)) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">
          {done.toLocaleString("id-ID")} / {target.toLocaleString("id-ID")}
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
          {cacat} unit cacat ({cacatPct}%)
        </p>
      )}
    </div>
  );
}
