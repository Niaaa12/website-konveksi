"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getProducts,
  getProductionUnits,
  getOperators,
  type WorkOrder,
  type WoStatus,
  type Product,
  type ProductionUnit,
  type AppUser,
} from "@/lib/firestore";
import {
  STATUS_CFG,
  StatusBadge,
} from "@/components/work-order/work-order-shared";
import {
  WOFormModal,
  type WOFormData,
} from "@/components/work-order/WOFormModal";
import { WODetailModal } from "@/components/work-order/WODetailModal";
import { WODeleteConfirm } from "@/components/work-order/WODeleteConfirm";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN JADWAL PRODUKSI
// Fokus: perencanaan & overview — kalender bulanan dan timeline Gantt.
// Sumber data: lib/firestore.ts (sama persis dengan halaman Work Order).
// Modal form/detail/hapus memakai komponen bersama yang sama, sehingga
// data yang ditampilkan dan diedit selalu konsisten dengan halaman Work Order.
// ─────────────────────────────────────────────────────────────────────────────

function MiniCalendar({
  workOrders,
  onSelect,
  selected,
}: {
  workOrders: WorkOrder[];
  onSelect: (date: string) => void;
  selected: string;
}) {
  const today = new Date();
  const [cur, setCur] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const str = toStr(d);
          const isToday = str === todayStr;
          const isSelected = str === selected;
          const hasStart = activeDates.has(str);
          const hasTarget = targetDates.has(str);
          return (
            <button
              key={d}
              onClick={() => onSelect(str)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg py-1 text-xs transition-colors hover:bg-muted/60",
                isToday && !isSelected && "ring-1 ring-[#003247]/40 font-bold",
                isSelected &&
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
      <div className="flex gap-3 mt-3 pt-3 border-t border-border">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mulai
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-red-400" /> Target Selesai
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-[#003247]" /> Dipilih
        </span>
      </div>
    </div>
  );
}

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
    return Math.floor((d.getTime() - rangeStart.getTime()) / 86400000);
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
              <div className="flex flex-1 relative items-center py-2">
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

type ViewMode = "kalender" | "gantt";

export default function JadwalProduksiPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [operators, setOperators] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewMode>("kalender");
  const [dateFilter, setDateFilter] = useState("");

  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);
  const [editWO, setEditWO] = useState<WorkOrder | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    const [wos, prods, us, ops] = await Promise.all([
      getWorkOrders().catch((e) => {
        console.error("getWorkOrders:", e);
        return [];
      }),
      getProducts().catch((e) => {
        console.error("getProducts:", e);
        return [];
      }),
      getProductionUnits().catch((e) => {
        console.error("getProductionUnits:", e);
        return [];
      }),
      getOperators().catch((e) => {
        console.error("getOperators:", e);
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

  async function handleSave(data: WOFormData, id?: string) {
    const payload: Omit<WorkOrder, "id" | "createdAt" | "updatedAt"> = {
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
      dibuatOleh: id
        ? workOrders.find((w) => w.id === id)?.dibuatOleh ?? ""
        : "",
      catatan: data.catatan,
    };
    if (id) await updateWorkOrder(id, payload);
    else await createWorkOrder(payload);
    await loadData();
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteWorkOrder(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    if (!dateFilter) return workOrders;
    return workOrders.filter(
      (wo) => wo.tanggalMulai <= dateFilter && wo.tanggalTarget >= dateFilter
    );
  }, [workOrders, dateFilter]);

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
            <span className={`inline-flex rounded-lg p-1.5 mb-2 ${s.color}`}>
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── View Toggle ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-border bg-card overflow-hidden text-sm w-fit">
          {(
            [
              { key: "kalender", label: "Kalender", icon: Calendar },
              { key: "gantt", label: "Timeline", icon: BarChart2 },
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
        <button
          onClick={() => setEditWO("new")}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
        >
          <Plus className="h-4 w-4" /> Buat WO
        </button>
      </div>

      {/* ── VIEWS ── */}
      {view === "gantt" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Timeline 28 Hari</h2>
            <p className="text-xs text-muted-foreground">
              {workOrders.length} work order
            </p>
          </div>
          <div className="p-4">
            <GanttView workOrders={workOrders} products={products} />
          </div>
        </div>
      )}

      {view === "kalender" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MiniCalendar
            workOrders={workOrders}
            selected={dateFilter}
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
            <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Menampilkan {filtered.length} dari {workOrders.length} work
                order
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals (komponen bersama — sama persis dengan halaman Work Order) ── */}
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
      {deleteTarget && (
        <WODeleteConfirm
          target={deleteTarget}
          deleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
