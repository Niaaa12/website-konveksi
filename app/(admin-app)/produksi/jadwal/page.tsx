"use client";

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  X,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  Factory,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TimerOff,
  PlayCircle,
  Filter,
  Search,
  Pencil,
  Trash2,
  BarChart2,
  Eye,
} from "lucide-react";
import { deleteWorkOrder } from "@/lib/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE
// ─────────────────────────────────────────────────────────────────────────────

type WoStatus = "dijadwalkan" | "berjalan" | "selesai" | "tertunda" | "batal";
type WoPrioritas = "rendah" | "normal" | "tinggi";

interface WorkOrder {
  id?: string;
  nomor: string;
  productId: string;
  variantId: string | null;
  jumlahTarget: number;
  jumlahSelesai: number;
  jumlahCacat: number;
  status: WoStatus;
  prioritas: WoPrioritas;
  unitId: string;
  operatorId?: string;
  tanggalMulai: string;
  tanggalTarget: string;
  tanggalSelesai: string | null;
  dibuatOleh?: string;
  catatan: string;
  createdAt?: any;
}

interface Product {
  id?: string;
  nama: string;
  kode: string;
}
interface ProdUnit {
  id?: string;
  nama: string;
  kode: string;
}
interface AppUser {
  id?: string;
  nama: string;
  role: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI STATUS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
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

const PRIORITAS_CFG: Record<WoPrioritas, { label: string; color: string }> = {
  rendah: { label: "Rendah", color: "text-gray-500" },
  normal: { label: "Normal", color: "text-blue-600" },
  tinggi: { label: "Tinggi", color: "text-red-600 font-semibold" },
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────

async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const snap = await getDocs(
    query(collection(db, "workOrders"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkOrder));
}
async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("nama"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}
async function fetchUnits(): Promise<ProdUnit[]> {
  const snap = await getDocs(
    query(collection(db, "productionUnits"), orderBy("nama"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProdUnit));
}
async function fetchOperators(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users")));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AppUser))
    .filter((u) => ["produksi", "manajer"].includes(u.role));
}

async function createWO(
  data: Omit<WorkOrder, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, "workOrders"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
async function updateWO(id: string, data: Partial<WorkOrder>): Promise<void> {
  await updateDoc(doc(db, "workOrders", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
async function modalDelete(id: string): Promise<void> {
  await deleteDoc(doc(db, "workOrders", id));
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WoStatus }) {
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

function PriorBadge({ prioritas }: { prioritas: WoPrioritas }) {
  const cfg = PRIORITAS_CFG[prioritas];
  return <span className={cn("text-[10px]", cfg.color)}>{cfg.label}</span>;
}

// Progress bar
function ProgressBar({
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

// ─────────────────────────────────────────────────────────────────────────────
// KALENDER MINI
// ─────────────────────────────────────────────────────────────────────────────

function MiniCalendar({
  workOrders,
  onSelect,
}: {
  workOrders: WorkOrder[];
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const [cur, setCur] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Tandai tanggal yang punya WO
  const activeDates = new Set<string>();
  const targetDates = new Set<string>();
  workOrders.forEach((wo) => {
    if (wo.tanggalMulai) activeDates.add(wo.tanggalMulai);
    if (wo.tanggalTarget) targetDates.add(wo.tanggalTarget);
  });

  const todayStr = today.toISOString().slice(0, 10);

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
  function toStr(d: number) {
    return `${year}-${pad(month + 1)}-${pad(d)}`;
  }

  const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const MONTHS = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Nav bulan */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCur(new Date(year, month - 1, 1))}
          className="rounded-lg p-1 hover:bg-muted/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => setCur(new Date(year, month + 1, 1))}
          className="rounded-lg p-1 hover:bg-muted/60"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Header hari */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Tanggal */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const str = toStr(d);
          const isToday = str === todayStr;
          const hasStart = activeDates.has(str);
          const hasTarget = targetDates.has(str);

          return (
            <button
              key={d}
              onClick={() => onSelect(str)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg py-1 text-xs transition-colors hover:bg-muted/60",
                isToday &&
                  "bg-[#003247] text-white hover:bg-[#004a6e] font-bold"
              )}
            >
              {d}
              <div className="flex gap-0.5 mt-0.5 h-1">
                {hasStart && (
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                )}
                {hasTarget && (
                  <span className="h-1 w-1 rounded-full bg-red-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-border">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mulai
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Target Selesai
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#003247]" /> Hari Ini
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW (Gantt sederhana)
// ─────────────────────────────────────────────────────────────────────────────

function GanttView({
  workOrders,
  products,
}: {
  workOrders: WorkOrder[];
  products: Product[];
}) {
  const today = new Date();
  const [rangeStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    return d;
  });

  const DAYS = 28;
  const cols = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function dayOffset(dateStr: string) {
    const d = new Date(dateStr);
    const diff = Math.floor((d.getTime() - rangeStart.getTime()) / 86400000);
    return diff;
  }
  function daySpan(start: string, end: string) {
    const s = new Date(start),
      e = new Date(end);
    return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1);
  }

  const active = workOrders.filter(
    (wo) => wo.status !== "batal" && wo.tanggalMulai && wo.tanggalTarget
  );

  if (active.length === 0)
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <BarChart2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">
          Belum ada jadwal aktif untuk ditampilkan
        </p>
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header tanggal */}
        <div className="flex border-b border-border">
          <div className="w-44 flex-shrink-0 px-3 py-2 text-[10px] font-medium text-muted-foreground">
            Work Order
          </div>
          <div className="flex flex-1">
            {cols.map((d, i) => {
              const isToday =
                d.toISOString().slice(0, 10) ===
                today.toISOString().slice(0, 10);
              const isSun = d.getDay() === 0;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 text-center py-2 text-[9px] font-medium border-l border-border/50",
                    isToday
                      ? "bg-[#003247]/10 text-[#003247] font-bold"
                      : isSun
                      ? "bg-muted/30 text-muted-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <div>{d.getDate()}</div>
                  <div className="text-[8px] opacity-70">
                    {
                      ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][
                        d.getDay()
                      ]
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Baris WO */}
        {active.map((wo) => {
          const prod = products.find((p) => p.id === wo.productId);
          const pct =
            wo.jumlahTarget > 0
              ? Math.round((wo.jumlahSelesai / wo.jumlahTarget) * 100)
              : 0;
          const cfg = STATUS_CFG[wo.status];
          const offset = dayOffset(wo.tanggalMulai);
          const span = daySpan(wo.tanggalMulai, wo.tanggalTarget);
          const clampedOffset = Math.max(0, offset);
          const clampedSpan = Math.max(
            1,
            Math.min(span + Math.min(0, offset), DAYS - clampedOffset)
          );
          const visible =
            clampedOffset < DAYS && clampedOffset + clampedSpan > 0;

          return (
            <div
              key={wo.id}
              className="flex border-b border-border/50 hover:bg-muted/10 transition-colors"
            >
              {/* Label */}
              <div className="w-44 flex-shrink-0 px-3 py-2">
                <p className="text-[10px] font-mono text-[#003247] leading-none">
                  {wo.nomor}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {prod?.nama ?? wo.productId}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                  <span className="text-[9px] text-muted-foreground">
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Bar area */}
              <div className="flex flex-1 relative items-center py-2">
                {/* Grid lines */}
                {cols.map((d, i) => {
                  const isToday =
                    d.toISOString().slice(0, 10) ===
                    today.toISOString().slice(0, 10);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute inset-y-0 border-l border-border/40",
                        isToday && "border-[#003247]/40 border-dashed"
                      )}
                      style={{ left: `${(i / DAYS) * 100}%` }}
                    />
                  );
                })}
                {/* Gantt bar */}
                {visible && (
                  <div
                    className="absolute h-7 rounded-md overflow-hidden border"
                    style={{
                      left: `${(clampedOffset / DAYS) * 100}%`,
                      width: `${(clampedSpan / DAYS) * 100}%`,
                    }}
                    title={`${wo.nomor}: ${pct}%`}
                  >
                    <div
                      className={cn(
                        "h-full w-full relative",
                        cfg.bg,
                        cfg.border
                      )}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute inset-0 bg-[#003247]/20 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium truncate">
                        {pct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM WO
// ─────────────────────────────────────────────────────────────────────────────

interface WOForm {
  nomor: string;
  productId: string;
  variantId: string;
  jumlahTarget: number;
  status: WoStatus;
  prioritas: WoPrioritas;
  unitId: string;
  operatorId: string;
  tanggalMulai: string;
  tanggalTarget: string;
  catatan: string;
}

const EMPTY_WO: WOForm = {
  nomor: "",
  productId: "",
  variantId: "",
  jumlahTarget: 0,
  status: "dijadwalkan",
  prioritas: "normal",
  unitId: "",
  operatorId: "",
  tanggalMulai: "",
  tanggalTarget: "",
  catatan: "",
};

function WOFormModal({
  initial,
  products,
  units,
  operators,
  onClose,
  onSave,
}: {
  initial?: WorkOrder;
  products: Product[];
  units: ProdUnit[];
  operators: AppUser[];
  onClose: () => void;
  onSave: (data: WOForm, id?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<WOForm>(
    initial
      ? {
          nomor: initial.nomor,
          productId: initial.productId,
          variantId: initial.variantId ?? "",
          jumlahTarget: initial.jumlahTarget,
          status: initial.status,
          prioritas: initial.prioritas,
          unitId: initial.unitId,
          operatorId: initial.operatorId ?? "",
          tanggalMulai: initial.tanggalMulai,
          tanggalTarget: initial.tanggalTarget,
          catatan: initial.catatan,
        }
      : { ...EMPTY_WO }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof WOForm, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.nomor ||
      !form.productId ||
      !form.unitId ||
      !form.tanggalMulai ||
      !form.tanggalTarget
    ) {
      setError("Nomor WO, produk, unit, dan tanggal wajib diisi.");
      return;
    }
    if (form.tanggalTarget < form.tanggalMulai) {
      setError("Tanggal target tidak boleh sebelum tanggal mulai.");
      return;
    }
    if (form.jumlahTarget <= 0) {
      setError("Jumlah target harus lebih dari 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Work Order" : "Buat Work Order Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{" "}
                {error}
              </div>
            )}

            {/* Nomor WO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Nomor WO <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nomor}
                  onChange={(e) => set("nomor", e.target.value)}
                  placeholder="WO-2505-006"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Prioritas
                </label>
                <select
                  value={form.prioritas}
                  onChange={(e) =>
                    set("prioritas", e.target.value as WoPrioritas)
                  }
                  className={inputClass}
                >
                  <option value="rendah">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="tinggi">Tinggi</option>
                </select>
              </div>
            </div>

            {/* Produk */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Produk <span className="text-red-500">*</span>
              </label>
              <select
                value={form.productId}
                onChange={(e) => set("productId", e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit & Operator */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Unit Produksi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.unitId}
                  onChange={(e) => set("unitId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Operator / PIC
                </label>
                <select
                  value={form.operatorId}
                  onChange={(e) => set("operatorId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih operator</option>
                  {operators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Jumlah target */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Jumlah Target (pcs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.jumlahTarget}
                onChange={(e) => set("jumlahTarget", Number(e.target.value))}
                className={inputClass}
              />
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggalMulai}
                  onChange={(e) => set("tanggalMulai", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Target Selesai <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggalTarget}
                  onChange={(e) => set("tanggalTarget", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Status (hanya edit) */}
            {isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STATUS_CFG) as WoStatus[]).map((s) => {
                    const cfg = STATUS_CFG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("status", s)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all",
                          form.status === s
                            ? "border-[#003247] bg-[#003247]/5 ring-1 ring-[#003247]/30"
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 flex-shrink-0",
                            form.status === s
                              ? "text-[#003247]"
                              : "text-muted-foreground"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            form.status === s ? "text-[#003247]" : ""
                          )}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Catatan */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Catatan
              </label>
              <textarea
                value={form.catatan}
                onChange={(e) => set("catatan", e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className={cn(inputClass, "resize-none")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
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
              {isEdit ? "Simpan" : "Buat WO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DETAIL WO
// ─────────────────────────────────────────────────────────────────────────────

function WODetailModal({
  wo,
  products,
  units,
  operators,
  onClose,
  onEdit,
}: {
  wo: WorkOrder;
  products: Product[];
  units: ProdUnit[];
  operators: AppUser[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const prod = products.find((p) => p.id === wo.productId);
  const unit = units.find((u) => u.id === wo.unitId);
  const op = operators.find((u) => u.id === wo.operatorId);
  const pct =
    wo.jumlahTarget > 0
      ? Math.round((wo.jumlahSelesai / wo.jumlahTarget) * 100)
      : 0;

  // Sisa hari
  const today = new Date();
  const target = new Date(wo.tanggalTarget);
  const sisaHari = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="rounded bg-[#003247]/10 px-2 py-0.5 font-mono text-xs text-[#003247]">
                {wo.nomor}
              </span>
              <StatusBadge status={wo.status} />
              <PriorBadge prioritas={wo.prioritas} />
            </div>
            <h2 className="text-sm font-semibold">
              {prod?.nama ?? wo.productId}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unit?.nama ?? wo.unitId}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/50"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border p-1.5 hover:bg-muted/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] px-6 py-5 space-y-5">
          {/* Progress */}
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Progress Produksi
                </p>
                <p className="text-2xl font-bold">{pct}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">
                  {wo.jumlahSelesai.toLocaleString("id-ID")} pcs
                </p>
                <p className="text-[10px] text-muted-foreground">
                  dari {wo.jumlahTarget.toLocaleString("id-ID")} target
                </p>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#003247] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {wo.jumlahCacat > 0 && (
              <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {wo.jumlahCacat} unit
                cacat
              </p>
            )}
          </div>

          {/* Info jadwal */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Mulai", value: wo.tanggalMulai },
              { label: "Target", value: wo.tanggalTarget },
              {
                label: wo.tanggalSelesai ? "Selesai" : "Sisa Hari",
                value:
                  wo.tanggalSelesai ??
                  (wo.status === "selesai"
                    ? "—"
                    : `${sisaHari > 0 ? sisaHari : 0} hari`),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border p-3"
              >
                <p className="text-[10px] text-muted-foreground mb-1">
                  {item.label}
                </p>
                <p className="text-xs font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Detail */}
          <div className="space-y-2.5">
            {[
              {
                label: "Operator / PIC",
                value: op?.nama ?? wo.operatorId ?? "—",
              },
              { label: "Unit Produksi", value: unit?.nama ?? wo.unitId },
              { label: "Prioritas", value: PRIORITAS_CFG[wo.prioritas].label },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-xs font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Catatan */}
          {wo.catatan && (
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Catatan</p>
              <p className="text-xs">{wo.catatan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN UTAMA JADWAL PRODUKSI
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = "tabel" | "gantt" | "kalender";

export default function JadwalProduksiPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<ProdUnit[]>([]);
  const [operators, setOperators] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("tabel");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<WoStatus | "">("");
  const [filterUnit, setFilterUnit] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);
  const [editWO, setEditWO] = useState<WorkOrder | null | "new">(null);
  const [modalDelete, setModalDelete] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    const [wos, prods, us, ops] = await Promise.all([
      fetchWorkOrders().catch((e) => {
        console.error(e);
        return [];
      }),
      fetchProducts().catch((e) => {
        console.error(e);
        return [];
      }),
      fetchUnits().catch((e) => {
        console.error(e);
        return [];
      }),
      fetchOperators().catch((e) => {
        console.error(e);
        return [];
      }),
    ]);
    setWorkOrders(wos);
    setProducts(prods);
    setUnits(us);
    setOperators(ops);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(data: WOForm, id?: string) {
    const payload: Omit<WorkOrder, "id" | "createdAt"> = {
      nomor: data.nomor,
      productId: data.productId,
      variantId: data.variantId || null,
      jumlahTarget: data.jumlahTarget,
      jumlahSelesai: id
        ? workOrders.find((w) => w.id === id)?.jumlahSelesai ?? 0
        : 0,
      jumlahCacat: id
        ? workOrders.find((w) => w.id === id)?.jumlahCacat ?? 0
        : 0,
      status: data.status,
      prioritas: data.prioritas,
      unitId: data.unitId,
      operatorId: data.operatorId,
      tanggalMulai: data.tanggalMulai,
      tanggalTarget: data.tanggalTarget,
      tanggalSelesai:
        data.status === "selesai"
          ? new Date().toISOString().slice(0, 10)
          : null,
      catatan: data.catatan,
    };
    if (id) await updateWO(id, payload);
    else await createWO(payload);
    await loadData();
  }

  async function handleDelete() {
    if (!modalDelete?.id) return;
    setDeleting(true);
    try {
      await deleteWorkOrder(modalDelete.id);
      setModalDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  // Filter
  const filtered = useMemo(
    () =>
      workOrders.filter((wo) => {
        const q = search.toLowerCase();
        const prod = products.find((p) => p.id === wo.productId);
        const matchSearch =
          !q ||
          wo.nomor.toLowerCase().includes(q) ||
          (prod?.nama.toLowerCase().includes(q) ?? false);
        const matchStatus = !filterStatus || wo.status === filterStatus;
        const matchUnit = !filterUnit || wo.unitId === filterUnit;
        const matchDate =
          !dateFilter ||
          (wo.tanggalMulai <= dateFilter && wo.tanggalTarget >= dateFilter);
        return matchSearch && matchStatus && matchUnit && matchDate;
      }),
    [workOrders, search, filterStatus, filterUnit, dateFilter, products]
  );

  // Stats
  const stats = useMemo(
    () => ({
      total: workOrders.length,
      berjalan: workOrders.filter((w) => w.status === "berjalan").length,
      dijadwalkan: workOrders.filter((w) => w.status === "dijadwalkan").length,
      tertunda: workOrders.filter((w) => w.status === "tertunda").length,
      selesai: workOrders.filter((w) => w.status === "selesai").length,
    }),
    [workOrders]
  );

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">
            Memuat jadwal produksi...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total WO",
            value: stats.total,
            color: "bg-slate-100 text-slate-700",
            icon: Layers,
          },
          {
            label: "Berjalan",
            value: stats.berjalan,
            color: "bg-emerald-100 text-emerald-700",
            icon: PlayCircle,
          },
          {
            label: "Dijadwalkan",
            value: stats.dijadwalkan,
            color: "bg-slate-100 text-slate-600",
            icon: Calendar,
          },
          {
            label: "Tertunda",
            value: stats.tertunda,
            color: "bg-amber-100 text-amber-700",
            icon: AlertTriangle,
          },
          {
            label: "Selesai",
            value: stats.selesai,
            color: "bg-blue-100 text-blue-700",
            icon: CheckCircle2,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <span className={cn("inline-flex rounded-lg p-1.5 mb-2", s.color)}>
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── View Toggle ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View selector */}
        <div className="flex rounded-xl border border-border bg-card overflow-hidden text-sm">
          {(
            [
              { key: "tabel", label: "Tabel", icon: Layers },
              { key: "gantt", label: "Timeline", icon: BarChart2 },
              { key: "kalender", label: "Kalender", icon: Calendar },
            ] as { key: ViewMode; label: string; icon: React.ElementType }[]
          ).map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 transition-colors",
                view === v.key ? "bg-[#003247] text-white" : "hover:bg-muted/50"
              )}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor WO atau produk..."
              className="rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 w-52"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          >
            <option value="">Semua Status</option>
            {(Object.keys(STATUS_CFG) as WoStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_CFG[s].label}
              </option>
            ))}
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          >
            <option value="">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter tanggal aktif"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>
      </div>

      {/* ── VIEWS ── */}
      {view === "gantt" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Timeline 28 Hari</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} work order
            </p>
          </div>
          <div className="p-4">
            <GanttView workOrders={filtered} products={products} />
          </div>
        </div>
      )}

      {view === "kalender" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MiniCalendar
            workOrders={filtered}
            onSelect={(d) => setDateFilter(d === dateFilter ? "" : d)}
          />
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">
                {dateFilter
                  ? `WO aktif pada ${dateFilter}`
                  : "Semua Work Order"}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Tidak ada WO pada tanggal ini
                </div>
              ) : (
                filtered.map((wo) => {
                  const prod = products.find((p) => p.id === wo.productId);
                  return (
                    <div
                      key={wo.id}
                      onClick={() => setDetailWO(wo)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 cursor-pointer"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full flex-shrink-0",
                          STATUS_CFG[wo.status].dot
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {wo.nomor} — {prod?.nama}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {wo.tanggalMulai} → {wo.tanggalTarget}
                        </p>
                      </div>
                      <StatusBadge status={wo.status} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {view === "tabel" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Menampilkan{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              dari {workOrders.length} work order
            </p>
            {(search || filterStatus || filterUnit || dateFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterStatus("");
                  setFilterUnit("");
                  setDateFilter("");
                }}
                className="text-xs text-[#003247] hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Reset filter
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Factory className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Belum ada work order
              </p>
              <button
                onClick={() => setEditWO("new")}
                className="mt-2 text-xs text-[#003247] hover:underline"
              >
                + Buat work order pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                    <th className="px-5 py-3">Nomor WO</th>
                    <th className="px-5 py-3">Produk</th>
                    <th className="px-5 py-3 hidden md:table-cell">Unit</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Progress</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Jadwal</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((wo) => {
                    const prod = products.find((p) => p.id === wo.productId);
                    const unit = units.find((u) => u.id === wo.unitId);
                    const today = new Date().toISOString().slice(0, 10);
                    const terlambat =
                      wo.status !== "selesai" &&
                      wo.status !== "batal" &&
                      wo.tanggalTarget < today;

                    return (
                      <tr
                        key={wo.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {terlambat && (
                              <span title="Melewati Target">
                                <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                              </span>
                            )}
                            <div>
                              <p className="text-xs font-mono font-semibold text-[#003247]">
                                {wo.nomor}
                              </p>
                              <PriorBadge prioritas={wo.prioritas} />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-medium">
                            {prod?.nama ?? wo.productId}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {prod?.kode}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                          {unit?.nama ?? wo.unitId}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell w-40">
                          <ProgressBar
                            done={wo.jumlahSelesai}
                            target={wo.jumlahTarget}
                            cacat={wo.jumlahCacat}
                          />
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <p className="text-[10px] text-muted-foreground">
                            Mulai: {wo.tanggalMulai}
                          </p>
                          <p
                            className={cn(
                              "text-[10px]",
                              terlambat
                                ? "text-red-500 font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            Target: {wo.tanggalTarget}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={wo.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setDetailWO(wo)}
                              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60"
                              title="Detail"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditWO(wo)}
                              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setModalDelete(wo)}
                              className="rounded-lg border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Detail ── */}
      {detailWO && !editWO && (
        <WODetailModal
          wo={detailWO}
          products={products}
          units={units}
          operators={operators}
          onClose={() => setDetailWO(null)}
          onEdit={() => {
            setEditWO(detailWO);
            setDetailWO(null);
          }}
        />
      )}

      {/* ── Modal Form ── */}
      {editWO && (
        <WOFormModal
          initial={editWO === "new" ? undefined : editWO}
          products={products}
          units={units}
          operators={operators}
          onClose={() => setEditWO(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Modal Hapus ── */}
      {modalDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Hapus Work Order?</h3>
                <p className="text-xs text-muted-foreground">
                  Tindakan ini tidak bisa dibatalkan
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Work Order{" "}
              <strong className="text-foreground">{modalDelete.nomor}</strong>{" "}
              dan seluruh log progress-nya akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalDelete(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{" "}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
