"use client";

import { cn } from "@/lib/utils";
import {
  Download, Edit, Eye, Filter, Loader2, Plus, Search, Trash2, X,
  ClipboardList, Calendar, Package, Hash, AlignLeft, ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

const BRAND = "#003247";
const BRAND_LIGHT = "#004766";

interface WorkOrderForm {
  produk: string;
  lini: string;
  target: string;
  targetSelesai: string;
  keterangan: string;
  status: string;
}

interface WorkOrder extends WorkOrderForm {
  id: string;
  progress: number;
}

const defaultForm: WorkOrderForm = {
  produk: "", lini: "", target: "", targetSelesai: "", keterangan: "", status: "Dijadwalkan",
};

const liniOptions = ["Lini A", "Lini B", "Lini C", "Lini D"];
const statusOptions = ["Dijadwalkan", "Berjalan", "Tertunda", "Selesai"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Berjalan: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Selesai: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    Tertunda: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    Dijadwalkan: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", map[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

// ─── Modal Form (Tambah & Edit) ──────────────────────────────────
function WOFormModal({ open, onClose, onSubmit, initial, mode }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: WorkOrderForm) => void;
  initial?: WorkOrderForm; mode: "tambah" | "edit";
}) {
  const [form, setForm] = useState<WorkOrderForm>(initial ?? defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<WorkOrderForm>>({});

  if (!open) return null;

  function handleChange(field: keyof WorkOrderForm, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: "" }));
  }

  function validate() {
    const e: Partial<WorkOrderForm> = {};
    if (!form.produk.trim()) e.produk = "Nama produk wajib diisi.";
    if (!form.lini) e.lini = "Pilih lini produksi.";
    if (!form.target || isNaN(Number(form.target)) || Number(form.target) <= 0) e.target = "Target harus angka positif.";
    if (!form.targetSelesai) e.targetSelesai = "Tanggal target wajib diisi.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    onSubmit(form);
    setLoading(false);
    setErrors({});
    onClose();
  }

  function handleClose() {
    if (loading) return;
    setErrors({});
    onClose();
  }

  const inputCls = (f: keyof WorkOrderForm) => cn(
    "w-full h-10 px-3 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all disabled:opacity-60",
    errors[f] ? "border-red-400 focus:ring-1 focus:ring-red-400" : "border-border focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30"
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {mode === "tambah" ? "Buat Work Order Baru" : "Edit Work Order"}
                </h2>
                <p className="text-[11px] text-white/60">
                  {mode === "tambah" ? "Isi detail pesanan produksi" : "Ubah detail work order"}
                </p>
              </div>
            </div>
            <button onClick={handleClose} disabled={loading} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                <Package className="h-3.5 w-3.5" /> Nama Produk <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.produk} onChange={e => handleChange("produk", e.target.value)}
                placeholder="cth. Hijab Segi Empat Polos" disabled={loading} className={inputCls("produk")} />
              {errors.produk && <p className="mt-1 text-[11px] text-red-500">{errors.produk}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Hash className="h-3.5 w-3.5" /> Lini Produksi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select value={form.lini} onChange={e => handleChange("lini", e.target.value)} disabled={loading}
                    className={cn(inputCls("lini"), "pr-8 appearance-none")}>
                    <option value="">Pilih lini...</option>
                    {liniOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {errors.lini && <p className="mt-1 text-[11px] text-red-500">{errors.lini}</p>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Status Awal</label>
                <div className="relative">
                  <select value={form.status} onChange={e => handleChange("status", e.target.value)} disabled={loading}
                    className="w-full h-10 pl-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground outline-none appearance-none focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30 transition-all disabled:opacity-60">
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Target (unit) <span className="text-red-500">*</span>
                </label>
                <input type="number" min={1} value={form.target} onChange={e => handleChange("target", e.target.value)}
                  placeholder="0" disabled={loading} className={inputCls("target")} />
                {errors.target && <p className="mt-1 text-[11px] text-red-500">{errors.target}</p>}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Target Selesai <span className="text-red-500">*</span>
                </label>
                <input type="date" value={form.targetSelesai} onChange={e => handleChange("targetSelesai", e.target.value)}
                  disabled={loading} className={inputCls("targetSelesai")} />
                {errors.targetSelesai && <p className="mt-1 text-[11px] text-red-500">{errors.targetSelesai}</p>}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                <AlignLeft className="h-3.5 w-3.5" /> Keterangan
              </label>
              <textarea rows={3} value={form.keterangan} onChange={e => handleChange("keterangan", e.target.value)}
                placeholder="Catatan tambahan (opsional)..." disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30 transition-all disabled:opacity-60" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} disabled={loading}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60">
                Batal
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                style={{ background: BRAND }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <>{mode === "tambah" ? <Plus className="h-4 w-4" /> : <Edit className="h-4 w-4" />}{mode === "tambah" ? "Buat Work Order" : "Simpan Perubahan"}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Modal Lihat Detail ──────────────────────────────────────────
function ViewWOModal({ open, onClose, wo }: { open: boolean; onClose: () => void; wo: WorkOrder | null }) {
  if (!open || !wo) return null;
  const rows: [string, React.ReactNode][] = [
    ["ID Work Order", <span className="font-mono text-xs">{wo.id}</span>],
    ["Nama Produk", wo.produk],
    ["Lini Produksi", wo.lini],
    ["Target (unit)", Number(wo.target).toLocaleString("id-ID")],
    ["Progress", `${wo.progress}%`],
    ["Status", <StatusBadge key="s" status={wo.status} />],
    ["Target Selesai", wo.targetSelesai ? new Date(wo.targetSelesai).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"],
    ["Keterangan", wo.keterangan || "—"],
  ];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Eye className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Detail Work Order</h2>
                <p className="text-[11px] text-white/60">{wo.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            {rows.map(([label, val]) => (
              <div key={label as string} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground flex-shrink-0 w-36">{label}</span>
                <span className="text-sm font-medium text-foreground text-right">{val}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Progress Produksi</span>
                <span className="font-medium">{wo.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${wo.progress}%`, background: BRAND }} />
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Modal Konfirmasi Hapus ──────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, label }: {
  open: boolean; onClose: () => void; onConfirm: () => void; label: string;
}) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  async function handle() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    onConfirm();
    setLoading(false);
    onClose();
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hapus Work Order?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Work order <span className="font-semibold text-foreground">"{label}"</span> akan dihapus permanen dan tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex w-full gap-3">
              <button onClick={onClose} disabled={loading}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60">
                Batal
              </button>
              <button onClick={handle} disabled={loading}
                className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Menghapus...</> : <><Trash2 className="h-4 w-4" />Hapus</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Halaman Work Order ──────────────────────────────────────────
export default function WorkOrderPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState<WorkOrder | null>(null);
  const [modalView, setModalView] = useState<WorkOrder | null>(null);
  const [modalDelete, setModalDelete] = useState<WorkOrder | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const statuses = ["Semua", "Berjalan", "Selesai", "Tertunda", "Dijadwalkan"];

  const filtered = workOrders.filter(wo => {
    const matchSearch = search === "" || wo.produk.toLowerCase().includes(search.toLowerCase()) || wo.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Semua" || wo.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function handleAdd(data: WorkOrderForm) {
    const id = `WO-${String(workOrders.length + 1).padStart(3, "0")}`;
    setWorkOrders(prev => [...prev, { ...data, id, progress: 0 }]);
  }

  function handleEdit(data: WorkOrderForm) {
    if (!modalEdit) return;
    setWorkOrders(prev => prev.map(wo => wo.id === modalEdit.id ? { ...wo, ...data } : wo));
  }

  function handleDelete() {
    if (!modalDelete) return;
    setWorkOrders(prev => prev.filter(wo => wo.id !== modalDelete.id));
    setModalDelete(null);
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Cari work order atau produk..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-[#003247]/30 focus:border-[#003247] transition-all" />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors">
            <Filter className="h-4 w-4" /><span className="hidden sm:inline">Filter</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors">
            <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setModalAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-all active:scale-[0.98]"
            style={{ background: BRAND }}>
            <Plus className="h-4 w-4" /><span>Buat WO</span>
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {statuses.map(s => {
          const count = s === "Semua" ? workOrders.length : workOrders.filter(w => w.status === s).length;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                filterStatus === s ? "text-white" : "bg-card border border-border text-muted-foreground hover:bg-accent")}
              style={filterStatus === s ? { background: BRAND } : {}}>
              {s}
              {count > 0 && (
                <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  filterStatus === s ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["ID", "Produk", "Lini", "Target", "Progress", "Status", "Target Selesai", "Aksi"].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-xs font-medium text-muted-foreground",
                    h === "Target" ? "text-right" : h === "Aksi" ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList className="h-10 w-10 opacity-20" />
                      <div>
                        <p className="text-sm font-medium">
                          {search || filterStatus !== "Semua" ? "Tidak ada hasil yang cocok" : "Belum ada work order"}
                        </p>
                        <p className="text-xs mt-0.5">
                          {search || filterStatus !== "Semua" ? "Coba ubah filter pencarian" : "Klik \"Buat WO\" untuk membuat work order pertama"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((wo, idx) => (
                  <tr key={wo.id} className={cn("border-b border-border transition-colors hover:bg-muted/30", idx % 2 !== 0 && "bg-muted/10")}>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{wo.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{wo.produk}</td>
                    <td className="px-4 py-3 text-muted-foreground">{wo.lini}</td>
                    <td className="px-4 py-3 text-right font-medium">{Number(wo.target).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${wo.progress}%`, background: BRAND }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{wo.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {wo.targetSelesai ? new Date(wo.targetSelesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModalView(wo)} title="Lihat Detail"
                          className="rounded-lg p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground hover:text-blue-500 transition-colors">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setModalEdit(wo)} title="Edit"
                          className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setModalDelete(wo)} title="Hapus"
                          className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Menampilkan {filtered.length} dari {workOrders.length} work order</p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50">Sebelumnya</button>
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent">Selanjutnya</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <WOFormModal open={modalAdd} onClose={() => setModalAdd(false)} onSubmit={handleAdd} mode="tambah" />
      <WOFormModal open={!!modalEdit} onClose={() => setModalEdit(null)} onSubmit={handleEdit}
        initial={modalEdit ?? undefined} mode="edit" key={modalEdit?.id ?? "edit"} />
      <ViewWOModal open={!!modalView} onClose={() => setModalView(null)} wo={modalView} />
      <DeleteModal open={!!modalDelete} onClose={() => setModalDelete(null)}
        onConfirm={handleDelete} label={modalDelete?.produk ?? ""} />
    </div>
  );
}
