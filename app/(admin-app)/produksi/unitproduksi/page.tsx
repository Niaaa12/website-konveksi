"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getProductionUnitsWithEfisiensi,
  createProductionUnit,
  updateProductionUnit,
  deleteProductionUnit,
  type ProductionUnit,
  type UnitKategori,
} from "@/lib/firestore";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { useRBAC } from "@/hooks/useRBAC";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { ErrorModal } from "@/components/ui/ErrorModal";
import {
  Plus,
  Loader2,
  X,
  Check,
  AlertCircle,
  Search,
  Pencil,
  Trash2,
  Factory,
  Wrench,
  Scissors,
  Shirt,
  ClipboardCheck,
  Settings2,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI KATEGORI & STATUS
// ─────────────────────────────────────────────────────────────────────────────

const KATEGORI_CFG: Record<
  UnitKategori,
  { label: string; icon: React.ElementType; color: string }
> = {
  jahit: {
    label: "Jahit",
    icon: Shirt,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  obras: {
    label: "Obras",
    icon: Settings2,
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
  potong: {
    label: "Potong",
    icon: Scissors,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  finishing: {
    label: "Finishing",
    icon: Wrench,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  qc: {
    label: "QC",
    icon: ClipboardCheck,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400",
  },
  lainnya: {
    label: "Lainnya",
    icon: Factory,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

const STATUS_CFG: Record<
  string,
  { label: string; bg: string; dot: string; icon: React.ElementType }
> = {
  aktif: {
    label: "Aktif",
    bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  idle: {
    label: "Idle",
    bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
    icon: PauseCircle,
  },
  maintenance: {
    label: "Maintenance",
    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
};

function EfisiensiBar({ value }: { value: number }) {
  const color =
    value >= 85
      ? "bg-emerald-500"
      : value >= 60
      ? "bg-amber-500"
      : value > 0
      ? "bg-red-500"
      : "bg-muted";
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-medium w-8 text-right">{value}%</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM TAMBAH / EDIT UNIT
// ─────────────────────────────────────────────────────────────────────────────

interface UnitForm {
  kode: string;
  nama: string;
  jenis: string;
  kategori: UnitKategori;
  status: "aktif" | "idle" | "maintenance";
  jadwalMaintenance: string;
  catatan: string;
}
const EMPTY_FORM: UnitForm = {
  kode: "",
  nama: "",
  jenis: "",
  kategori: "jahit",
  status: "aktif",
  jadwalMaintenance: "",
  catatan: "",
};

function UnitFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: ProductionUnit;
  onClose: () => void;
  onSave: (data: UnitForm, id?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<UnitForm>(
    initial
      ? {
          kode: initial.kode,
          nama: initial.nama,
          jenis: initial.jenis,
          kategori: initial.kategori,
          status: initial.status as any,
          jadwalMaintenance: initial.jadwalMaintenance,
          catatan: initial.catatan,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof UnitForm, v: any) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kode.trim() || !form.nama.trim() || !form.jenis.trim()) {
      setError("Kode, nama, dan jenis mesin wajib diisi.");
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Unit Produksi" : "Tambah Unit Produksi"}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.kode}
                  onChange={(e) => set("kode", e.target.value)}
                  placeholder="MJ-41"
                  className={cn(inputClass, "font-mono")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.kategori}
                  onChange={(e) =>
                    set("kategori", e.target.value as UnitKategori)
                  }
                  className={inputClass}
                >
                  {(Object.keys(KATEGORI_CFG) as UnitKategori[]).map((k) => (
                    <option key={k} value={k}>
                      {KATEGORI_CFG[k].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Nama Unit <span className="text-red-500">*</span>
              </label>
              <input
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Unit Jahit 41"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Jenis Mesin <span className="text-red-500">*</span>
              </label>
              <input
                value={form.jenis}
                onChange={(e) => set("jenis", e.target.value)}
                placeholder="Mesin Jahit High Speed Juki"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(STATUS_CFG) as (keyof typeof STATUS_CFG)[]).map(
                  (s) => {
                    const cfg = STATUS_CFG[s];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("status", s)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl border p-2.5 text-left transition-all",
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
                  }
                )}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Jadwal Maintenance Berikutnya
              </label>
              <input
                type="date"
                value={form.jadwalMaintenance}
                onChange={(e) => set("jadwalMaintenance", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Catatan
              </label>
              <textarea
                value={form.catatan}
                onChange={(e) => set("catatan", e.target.value)}
                rows={2}
                placeholder="Catatan tambahan (opsional)..."
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
              {isEdit ? "Simpan" : "Tambah Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN UTAMA Unit PRODUKSI
// ─────────────────────────────────────────────────────────────────────────────

export default function UnitProduksiPage() {
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<UnitKategori | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [editUnit, setEditUnit] = useState<ProductionUnit | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionUnit | null>(null);
  const [deleting, setDeleting] = useState(false);

  // State modal sukses
  const [successPopup, setSuccessPopup] = useState({
    isOpen: false,
    message: "",
  });

  // State modal error
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    message: "",
  });

  const { can } = useRBAC();
  const canWrite = can(["admin", "kepalaTimProduksi"]);

  async function loadData() {
    setLoading(true);
    try {
      // getProductionUnitsWithEfisiensi otomatis menghitung ulang efisiensi
      // dari histori Work Order — bukan mengambil angka statis dari Firestore.
      const data = await getProductionUnitsWithEfisiensi();
      setUnits(data);
    } catch (e: any) {
      setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal memuat data unit produksi. Periksa koneksi internet Anda." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterKategori, filterStatus]);

  async function handleSave(data: UnitForm, id?: string) {
    if (id) {
      try {
        await updateProductionUnit(id, data);
        setSuccessPopup({
          isOpen: true,
          message: `Unit produksi ${data.nama} berhasil diperbarui!`,
        });
      } catch (e: any) {
        setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal memperbarui unit produksi. Coba lagi." });
      }
    } else {
      try {
        await createProductionUnit({ ...data, efisiensi: 0 });
        setSuccessPopup({
          isOpen: true,
          message: `Unit produksi ${data.nama} berhasil ditambahkan!`,
        });
      } catch (e: any) {
        setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal menambah unit produksi. Coba lagi." });
      }
    }
    await loadData();
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    const deletedNama = deleteTarget.nama;
    setDeleting(true);
    try {
      await deleteProductionUnit(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessPopup({
        isOpen: true,
        message: `Unit produksi ${deletedNama} berhasil dihapus!`,
      });
      await loadData();
    } catch (e: any) {
      setErrorPopup({ isOpen: true, message: e?.message ?? "Gagal menghapus unit produksi. Coba lagi." });
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(
    () =>
      units.filter((u) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          u.nama.toLowerCase().includes(q) ||
          u.kode.toLowerCase().includes(q) ||
          u.jenis.toLowerCase().includes(q);
        const matchKategori = !filterKategori || u.kategori === filterKategori;
        const matchStatus = !filterStatus || u.status === filterStatus;
        return matchSearch && matchKategori && matchStatus;
      }),
    [units, search, filterKategori, filterStatus]
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const kategoriCount = useMemo(() => {
    const map: Partial<Record<UnitKategori, number>> = {};
    units.forEach((u) => {
      map[u.kategori] = (map[u.kategori] ?? 0) + 1;
    });
    return map;
  }, [units]);

  const stats = useMemo(
    () => ({
      total: units.length,
      aktif: units.filter((u) => u.status === "aktif").length,
      idle: units.filter((u) => u.status === "idle").length,
      maintenance: units.filter((u) => u.status === "maintenance").length,
      rataEfisiensi:
        units.filter((u) => u.status === "aktif").length > 0
          ? Math.round(
              units
                .filter((u) => u.status === "aktif")
                .reduce((s, u) => s + u.efisiensi, 0) /
                units.filter((u) => u.status === "aktif").length
            )
          : 0,
    }),
    [units]
  );

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">
            Memuat data unit produksi...
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
            label: "Total Unit",
            value: stats.total,
            color: "bg-slate-100 text-slate-700",
            icon: Factory,
          },
          {
            label: "Aktif",
            value: stats.aktif,
            color: "bg-emerald-100 text-emerald-700",
            icon: CheckCircle2,
          },
          {
            label: "Idle",
            value: stats.idle,
            color: "bg-slate-100 text-slate-600",
            icon: PauseCircle,
          },
          {
            label: "Maintenance",
            value: stats.maintenance,
            color: "bg-amber-100 text-amber-700",
            icon: AlertTriangle,
          },
          {
            label: "Rata² Efisiensi",
            value: `${stats.rataEfisiensi}%`,
            color: "bg-blue-100 text-blue-700",
            icon: Gauge,
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

      {/* ── Filter Kategori (chip) ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setFilterKategori("")}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
            !filterKategori
              ? "bg-[#003247] text-white"
              : "bg-card border border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Semua ({units.length})
        </button>
        {(Object.keys(KATEGORI_CFG) as UnitKategori[])
          .filter((k) => kategoriCount[k])
          .map((k) => {
            const cfg = KATEGORI_CFG[k];
            const Icon = cfg.icon;
            return (
              <button
                key={k}
                onClick={() => setFilterKategori(k === filterKategori ? "" : k)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  filterKategori === k
                    ? "bg-[#003247] text-white"
                    : "bg-card border border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-3 w-3" /> {cfg.label} ({kategoriCount[k]})
              </button>
            );
          })}
      </div>

      {/* ── Search & Status Filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, atau jenis mesin..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
        >
          <option value="">Semua Status</option>
          {Object.keys(STATUS_CFG).map((s) => (
            <option key={s} value={s}>
              {STATUS_CFG[s].label}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {canWrite && (
            <button
              onClick={() => setEditUnit("new")}
              className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Unit
            </button>
          )}
        </div>
      </div>

      {/* ── Tabel ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {(search || filterKategori || filterStatus) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterKategori("");
              setFilterStatus("");
            }}
            className="text-xs text-[#003247] hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Reset filter
          </button>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Factory className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Tidak ada unit yang cocok
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3">Kode</th>
                  <th className="px-5 py-3">Unit</th>
                  <th className="px-5 py-3 hidden md:table-cell">Kategori</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Efisiensi</th>
                  <th className="px-5 py-3 hidden lg:table-cell">
                    Maintenance Berikutnya
                  </th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedData.map((u) => {
                  const kCfg = KATEGORI_CFG[u.kategori] ?? KATEGORI_CFG.lainnya;
                  const sCfg = STATUS_CFG[u.status] ?? STATUS_CFG.idle;
                  const KIcon = kCfg.icon;
                  const SIcon = sCfg.icon;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-[#003247] font-semibold">
                        {u.kode}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium">{u.nama}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {u.jenis}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            kCfg.color
                          )}
                        >
                          <KIcon className="h-2.5 w-2.5" /> {kCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            sCfg.bg
                          )}
                        >
                          <SIcon className="h-2.5 w-2.5" /> {sCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <EfisiensiBar value={u.efisiensi} />
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                        {u.jadwalMaintenance || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {canWrite && (
                            <button
                              onClick={() => setEditUnit(u)}
                              className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="rounded-lg border border-red-200 bg-background p-1.5 hover:bg-red-50 text-red-500"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* ── Modal Form ── */}
      {editUnit && (
        <UnitFormModal
          initial={editUnit === "new" ? undefined : editUnit}
          onClose={() => setEditUnit(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Hapus Unit Produksi?</h3>
                <p className="text-xs text-muted-foreground">
                  Tindakan ini tidak bisa dibatalkan
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Unit{" "}
              <strong className="text-foreground">{deleteTarget.nama}</strong> (
              {deleteTarget.kode}) akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
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

      <SuccessModal
        isOpen={successPopup.isOpen}
        message={successPopup.message}
        onClose={() => setSuccessPopup({ isOpen: false, message: "" })}
      />
      <ErrorModal
        isOpen={errorPopup.isOpen}
        message={errorPopup.message}
        onClose={() => setErrorPopup({ isOpen: false, message: "" })}
      />
    </div>
  );
}
