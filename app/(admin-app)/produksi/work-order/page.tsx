"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  getProducts,
  getProductionUnits,
  getOperators,
  getVariantsByProductIds,
  type WorkOrder,
  type WoStatus,
  type Product,
  type ProductionUnit,
  type AppUser,
  type ProductVariant,
} from "@/lib/firestore";
import {
  STATUS_CFG,
  StatusBadge,
  TahapBadge,
  PriorBadge,
  ProgressBar,
} from "@/components/work-order/work-order-shared";
import {
  WOFormModal,
  type WOFormData,
} from "@/components/work-order/WOFormModal";
import { WODetailModal } from "@/components/work-order/WODetailModal";
import { WODeleteConfirm } from "@/components/work-order/WODeleteConfirm";
import {
  Plus,
  Loader2,
  X,
  Search,
  Pencil,
  Trash2,
  Eye,
  Factory,
  Layers,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Calendar,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN WORK ORDER
// Fokus: operasional harian — tabel detail, edit cepat, update progress.
// Sumber data: lib/firestore.ts (sama persis dengan halaman Jadwal Produksi).
// ─────────────────────────────────────────────────────────────────────────────

// ── Komponen badge warna + ukuran varian ─────────────────────────────────────
function VarianBadge({
  productId,
  variantId,
  variantMap,
}: {
  productId: string;
  variantId: string | null;
  variantMap: Record<string, ProductVariant[]>;
}) {
  if (!variantId)
    return <span className="text-xs text-muted-foreground">—</span>;

  const variant = (variantMap[productId] ?? []).find((v) => v.id === variantId);

  if (!variant) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="h-3 w-3 rounded-full flex-shrink-0 border border-border/50"
        style={{ backgroundColor: variant.kodeHex }}
      />
      <span className="text-xs font-medium">{variant.namaWarna}</span>
      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {variant.ukuran}
      </span>
    </div>
  );
}

function WorkOrderPageContent() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [operators, setOperators] = useState<AppUser[]>([]);
  const [variantMap, setVariantMap] = useState<
    Record<string, ProductVariant[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<WoStatus | "">("");
  const [filterUnit, setFilterUnit] = useState("");

  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);
  const [editWO, setEditWO] = useState<WorkOrder | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchParams = useSearchParams();
  const paramProductId = searchParams.get("productId");
  const paramVariantId = searchParams.get("variantId");
  const paramJumlah = searchParams.get("jumlah");

  const prefillData = useMemo(() => {
    if (paramProductId && paramVariantId) {
      return {
        productId: paramProductId,
        variantId: paramVariantId,
        jumlahTarget: Number(paramJumlah || 50),
        nomor: `WO-${Date.now().toString().slice(-6)}`,
        tanggalMulai: new Date().toISOString().slice(0, 10),
        tanggalTarget: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        catatan: "Dibuat otomatis dari peringatan stok Gudang Packing.",
      };
    }
    return undefined;
  }, [paramProductId, paramVariantId, paramJumlah]);

  useEffect(() => {
    if (prefillData) {
      setEditWO("new");
    }
  }, [prefillData]);

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
    // Fetch semua variant dari product yang ada di daftar WO
    const productIds = wos.map((w) => w.productId);
    const vMap = await getVariantsByProductIds(productIds).catch(() => ({}));
    setVariantMap(vMap);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(data: WOFormData, id?: string) {
    const existingWO = id ? workOrders.find((w) => w.id === id) : undefined;
    const payload: Omit<WorkOrder, "id" | "createdAt" | "updatedAt"> = {
      nomor: data.nomor,
      productId: data.productId,
      variantId: data.variantId || null,
      jumlahTarget: data.jumlahTarget,
      jumlahSelesai: existingWO?.jumlahSelesai ?? 0,
      jumlahCacat: existingWO?.jumlahCacat ?? 0,
      status: data.status,
      prioritas: data.prioritas,
      tahapSaatIni: existingWO?.tahapSaatIni ?? ("potong" as any),
      progress: existingWO?.progress ?? 0,
      unitId: data.unitId,
      operatorId: data.operatorId,
      tanggalMulai: data.tanggalMulai,
      tanggalTarget: data.tanggalTarget,
      tanggalSelesai:
        data.status === "selesai"
          ? new Date().toISOString().slice(0, 10)
          : null,
      dibuatOleh: existingWO?.dibuatOleh ?? "",
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
        return matchSearch && matchStatus && matchUnit;
      }),
    [workOrders, search, filterStatus, filterUnit, products]
  );

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
            Memuat data work order...
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

      {/* ── Filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor WO atau produk..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
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
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
        >
          <option value="">Semua Unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama}
            </option>
          ))}
        </select>
        <button
          onClick={() => setEditWO("new")}
          className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
        >
          <Plus className="h-4 w-4" /> Buat WO
        </button>
      </div>

      {/* ── Tabel ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Menampilkan{" "}
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>{" "}
            dari {workOrders.length} work order
          </p>
          {(search || filterStatus || filterUnit) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("");
                setFilterUnit("");
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
              {search || filterStatus || filterUnit
                ? "Tidak ada hasil yang cocok"
                : "Belum ada work order"}
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
                  <th className="px-5 py-3 hidden sm:table-cell">Varian</th>
                  <th className="px-5 py-3 hidden md:table-cell">Unit</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Progress</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Jadwal</th>
                  <th className="px-5 py-3">Tahap Aktif</th>
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
                            <span title="Melewati target">
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
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <VarianBadge
                          productId={wo.productId}
                          variantId={wo.variantId}
                          variantMap={variantMap}
                        />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                        {unit?.nama ?? wo.unitId}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell w-40">
                        <ProgressBar
                          done={wo.jumlahSelesai}
                          target={wo.jumlahTarget}
                          cacat={wo.jumlahCacat}
                          progress={wo.progress ?? 0}
                        />
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-[10px] text-muted-foreground">
                          Mulai: {wo.tanggalMulai}
                        </p>
                        <p
                          className={`text-[10px] ${
                            terlambat
                              ? "text-red-500 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          Target: {wo.tanggalTarget}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <TahapBadge tahap={wo.tahapSaatIni} />
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
                            onClick={() => setDeleteTarget(wo)}
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
        {/* <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {workOrders.length} work order
          </p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50">
              Sebelumnya
            </button>
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent">
              Selanjutnya
            </button>
          </div>
        </div> */}
      </div>

      {/* ── Modals (komponen bersama) ── */}
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
          prefill={editWO === "new" ? prefillData : undefined}
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

export default function WorkOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
        </div>
      }
    >
      <WorkOrderPageContent />
    </Suspense>
  );
}
