"use client";

import { cn } from "@/lib/utils";
import {
  Plus, Search, Filter, Download, Edit, Trash2, Eye,
  X, Loader2, Boxes, AlignLeft, Hash, ChevronDown,
  AlertTriangle, AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, Material } from "@/lib/firestore";


const BRAND = "#003247";
const BRAND_LIGHT = "#004766";

// ─── Types ───────────────────────────────────────────────────────
interface BahanBaku {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  stok: number;
  stokMin: number;
  hargaSatuan: number;
  keterangan: string;
}

interface BahanForm {
  nama: string;
  kategori: string;
  satuan: string;
  stok: string;
  stokMin: string;
  hargaSatuan: string;
  keterangan: string;
}

const defaultForm: BahanForm = {
  nama: "", kategori: "", satuan: "", stok: "",
  stokMin: "", hargaSatuan: "", keterangan: "",
};

const kategoriOptions = ["Kain", "Benang", "Aksesori", "Pewarna", "Kemasan", "Lainnya"];
const satuanOptions = ["meter", "kg", "lusin", "gross", "pcs", "roll", "liter"];

// ─── Status stok ─────────────────────────────────────────────────
function StokBadge({ stok, stokMin }: { stok: number; stokMin: number }) {
  if (stok <= 0)
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Habis</span>;
  if (stok <= stokMin)
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Kritis</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Aman</span>;
}

// ─── Modal Tambah Bahan Baku ──────────────────────────────────────
function TambahBahanModal({ open, onClose, onSubmit, initial, mode = "tambah" }: {
  open: boolean; onClose: () => void; onSubmit: (d: BahanForm) => void;
  initial?: BahanForm; mode?: "tambah" | "edit";
}) {
  const [form, setForm] = useState<BahanForm>(initial ?? defaultForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<BahanForm>>({});

  if (!open) return null;

  function set(field: keyof BahanForm, value: string) {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: "" }));
  }

  function validate() {
    const e: Partial<BahanForm> = {};
    if (!form.nama.trim()) e.nama = "Nama bahan wajib diisi.";
    if (!form.kategori) e.kategori = "Pilih kategori.";
    if (!form.satuan) e.satuan = "Pilih satuan.";
    if (!form.stok || isNaN(+form.stok) || +form.stok < 0) e.stok = "Stok harus angka ≥ 0.";
    if (!form.stokMin || isNaN(+form.stokMin) || +form.stokMin < 0) e.stokMin = "Stok minimum harus angka ≥ 0.";
    if (!form.hargaSatuan || isNaN(+form.hargaSatuan) || +form.hargaSatuan < 0) e.hargaSatuan = "Harga harus angka ≥ 0.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onSubmit(form);
    setLoading(false);
    setForm(defaultForm);
    setErrors({});
    onClose();
  }

  function handleClose() {
    if (loading) return;
    setForm(defaultForm); setErrors({}); onClose();
  }

  const inputCls = (field: keyof BahanForm) => cn(
    "w-full h-10 px-3 rounded-lg border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all disabled:opacity-60",
    errors[field]
      ? "border-red-400 focus:ring-1 focus:ring-red-400"
      : "border-border focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30"
  );

  const selectCls = (field: keyof BahanForm) => cn(
    "w-full h-10 pl-3 pr-8 rounded-lg border bg-background text-sm text-foreground outline-none appearance-none transition-all disabled:opacity-60",
    errors[field]
      ? "border-red-400 focus:ring-1 focus:ring-red-400"
      : "border-border focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30"
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Boxes className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{mode === "edit" ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</h2>
                <p className="text-[11px] text-white/60">{mode === "edit" ? "Ubah data bahan baku" : "Isi data bahan baku baru"}</p>
              </div>
            </div>
            <button onClick={handleClose} disabled={loading} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Nama */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Nama Bahan <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.nama} onChange={e => set("nama", e.target.value)}
                placeholder="cth. Kain Voal Premium" disabled={loading} className={inputCls("nama")} />
              {errors.nama && <p className="mt-1 text-[11px] text-red-500">{errors.nama}</p>}
            </div>

            {/* Kategori + Satuan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select value={form.kategori} onChange={e => set("kategori", e.target.value)} disabled={loading} className={selectCls("kategori")}>
                    <option value="">Pilih...</option>
                    {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {errors.kategori && <p className="mt-1 text-[11px] text-red-500">{errors.kategori}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Satuan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select value={form.satuan} onChange={e => set("satuan", e.target.value)} disabled={loading} className={selectCls("satuan")}>
                    <option value="">Pilih...</option>
                    {satuanOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {errors.satuan && <p className="mt-1 text-[11px] text-red-500">{errors.satuan}</p>}
              </div>
            </div>

            {/* Stok + Stok Min */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Stok Awal <span className="text-red-500">*</span>
                </label>
                <input type="number" min={0} value={form.stok} onChange={e => set("stok", e.target.value)}
                  placeholder="0" disabled={loading} className={inputCls("stok")} />
                {errors.stok && <p className="mt-1 text-[11px] text-red-500">{errors.stok}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Stok Minimum <span className="text-red-500">*</span>
                </label>
                <input type="number" min={0} value={form.stokMin} onChange={e => set("stokMin", e.target.value)}
                  placeholder="0" disabled={loading} className={inputCls("stokMin")} />
                {errors.stokMin && <p className="mt-1 text-[11px] text-red-500">{errors.stokMin}</p>}
              </div>
            </div>

            {/* Harga Satuan */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Harga Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <input type="number" min={0} value={form.hargaSatuan} onChange={e => set("hargaSatuan", e.target.value)}
                  placeholder="0" disabled={loading}
                  className={cn(inputCls("hargaSatuan"), "pl-9")} />
              </div>
              {errors.hargaSatuan && <p className="mt-1 text-[11px] text-red-500">{errors.hargaSatuan}</p>}
            </div>

            {/* Keterangan */}
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                <AlignLeft className="h-3.5 w-3.5" /> Keterangan
              </label>
              <textarea rows={2} value={form.keterangan} onChange={e => set("keterangan", e.target.value)}
                placeholder="Catatan tambahan (opsional)..." disabled={loading}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-[#003247] focus:ring-1 focus:ring-[#003247]/30 transition-all disabled:opacity-60" />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} disabled={loading}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60">
                Batal
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 h-10 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                style={{ background: BRAND }}
                onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = BRAND_LIGHT)}
                onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = BRAND)}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <>{mode === "edit" ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{mode === "edit" ? "Simpan Perubahan" : "Tambah Bahan"}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Modal Lihat Detail ───────────────────────────────────────────
function ViewBahanModal({ open, onClose, b }: { open: boolean; onClose: () => void; b: BahanBaku | null }) {
  if (!open || !b) return null;
  const rows: [string, React.ReactNode][] = [
    ["ID", <span key="id" className="font-mono text-xs">{b.id}</span>],
    ["Nama Bahan", b.nama],
    ["Kategori", b.kategori],
    ["Satuan", b.satuan],
    ["Stok", b.stok.toLocaleString("id-ID")],
    ["Stok Minimum", b.stokMin.toLocaleString("id-ID")],
    ["Harga/Satuan", `Rp ${b.hargaSatuan.toLocaleString("id-ID")}`],
    ["Nilai Stok", `Rp ${(b.stok * b.hargaSatuan).toLocaleString("id-ID")}`],
    ["Status", <StokBadge key="s" stok={b.stok} stokMin={b.stokMin} />],
    ["Keterangan", b.keterangan || "—"],
  ];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ background: "#003247" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><Eye className="h-4 w-4 text-white" /></div>
              <div><h2 className="text-sm font-semibold text-white">Detail Bahan Baku</h2><p className="text-[11px] text-white/60">{b.id}</p></div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-6 space-y-1">
            {rows.map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground w-32">{label}</span>
                <span className="text-sm font-medium text-foreground text-right">{val}</span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">Tutup</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Modal Konfirmasi Hapus ────────────────────────────────────────
function DeleteBahanModal({ open, onClose, onConfirm, nama }: { open: boolean; onClose: () => void; onConfirm: () => void; nama: string }) {
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
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30"><AlertCircle className="h-6 w-6 text-red-500" /></div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Hapus Bahan Baku?</h3>
            <p className="mt-1 text-xs text-muted-foreground">Bahan <span className="font-semibold text-foreground">"{nama}"</span> akan dihapus permanen.</p>
          </div>
          <div className="flex w-full gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60">Batal</button>
            <button onClick={handle} disabled={loading} className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Menghapus...</> : <><Trash2 className="h-4 w-4" />Hapus</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Halaman Bahan Baku ───────────────────────────────────────────
export default function BahanBakuPage() {
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState<BahanBaku | null>(null);
  const [modalEdit, setModalEdit] = useState<BahanBaku | null>(null);
  const [modalDelete, setModalDelete] = useState<BahanBaku | null>(null);
  const [data, setData] = useState<BahanBaku[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const mats = await getMaterials();
        const mapped = mats.map(m => ({
          id: m.id || "",
          nama: m.nama,
          kategori: m.kategoriId.startsWith("cat-") ? m.kategoriId.replace("cat-", "") : m.kategoriId,
          satuan: m.satuan,
          stok: m.stokAktual,
          stokMin: m.stokMin,
          hargaSatuan: m.harga,
          keterangan: m.lokasiGudang || "",
        }));
        setData(mapped);
      } catch (err) {
        console.error("Failed to load materials", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const kategoriFilter = ["Semua", ...kategoriOptions];

  const filtered = data.filter(b => {
    const matchSearch = search === "" || b.nama.toLowerCase().includes(search.toLowerCase()) || b.kategori.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === "Semua" || b.kategori.toLowerCase() === filterKategori.toLowerCase();
    return matchSearch && matchKategori;
  });

  const stokKritis = data.filter(b => b.stok <= b.stokMin && b.stok > 0).length;
  const stokHabis = data.filter(b => b.stok <= 0).length;

  async function handleAdd(form: BahanForm) {
    try {
      const newId = await createMaterial({
        kode: `BB-${Math.floor(Math.random() * 10000)}`,
        nama: form.nama,
        kategoriId: form.kategori,
        supplierId: "sup-001",
        satuan: form.satuan,
        stokAktual: +form.stok,
        stokMin: +form.stokMin,
        stokMaks: +form.stokMin * 3,
        harga: +form.hargaSatuan,
        lokasiGudang: form.keterangan,
      });
      setData(prev => [...prev, { id: newId, nama: form.nama, kategori: form.kategori, satuan: form.satuan, stok: +form.stok, stokMin: +form.stokMin, hargaSatuan: +form.hargaSatuan, keterangan: form.keterangan }]);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleEdit(form: BahanForm) {
    if (!modalEdit) return;
    try {
      await updateMaterial(modalEdit.id, {
        nama: form.nama,
        kategoriId: form.kategori,
        satuan: form.satuan,
        stokAktual: +form.stok,
        stokMin: +form.stokMin,
        harga: +form.hargaSatuan,
        lokasiGudang: form.keterangan,
      });
      setData(prev => prev.map(b => b.id === modalEdit.id ? { ...b, nama: form.nama, kategori: form.kategori, satuan: form.satuan, stok: +form.stok, stokMin: +form.stokMin, hargaSatuan: +form.hargaSatuan, keterangan: form.keterangan } : b));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete() {
    if (!modalDelete) return;
    try {
      await deleteMaterial(modalDelete.id);
      setData(prev => prev.filter(b => b.id !== modalDelete.id));
      setModalDelete(null);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-5">
      {/* Alert stok kritis */}
      {(stokKritis > 0 || stokHabis > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Perhatian Stok!</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {stokHabis > 0 && `${stokHabis} bahan habis. `}
              {stokKritis > 0 && `${stokKritis} bahan dalam kondisi kritis.`}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Cari nama atau kategori bahan..." value={search}
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
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-all active:scale-[0.98]"
            style={{ background: BRAND }}>
            <Plus className="h-4 w-4" /><span>Tambah Bahan</span>
          </button>
        </div>
      </div>

      {/* Kategori filter */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {kategoriFilter.map(k => {
          const count = k === "Semua" ? data.length : data.filter(b => b.kategori === k).length;
          return (
            <button key={k} onClick={() => setFilterKategori(k)}
              className={cn("flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                filterKategori === k ? "text-white" : "bg-card border border-border text-muted-foreground hover:bg-accent")}
              style={filterKategori === k ? { background: BRAND } : {}}>
              {k}
              {count > 0 && (
                <span className={cn("ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full",
                  filterKategori === k ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tabel */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["ID", "Nama Bahan", "Kategori", "Stok", "Min. Stok", "Satuan", "Harga/Satuan", "Nilai Stok", "Status", "Aksi"].map(h => (
                  <th key={h} className={cn("px-4 py-3 text-xs font-medium text-muted-foreground",
                    ["Stok", "Min. Stok", "Harga/Satuan", "Nilai Stok"].includes(h) ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                      <p className="text-sm">Memuat data bahan baku...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Boxes className="h-10 w-10 opacity-20" />
                      <div>
                        <p className="text-sm font-medium">
                          {search || filterKategori !== "Semua" ? "Tidak ada hasil yang cocok" : "Belum ada data bahan baku"}
                        </p>
                        <p className="text-xs mt-0.5">
                          {search || filterKategori !== "Semua" ? "Coba ubah filter pencarian" : "Klik \"Tambah Bahan\" untuk menambahkan bahan baku pertama"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => (
                  <tr key={b.id} className={cn("border-b border-border transition-colors hover:bg-muted/30", idx % 2 !== 0 && "bg-muted/10")}>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{b.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{b.nama}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{b.kategori}</span>
                    </td>
                    <td className={cn("px-4 py-3 text-right font-semibold", b.stok <= b.stokMin ? "text-red-500" : "text-foreground")}>
                      {b.stok.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{b.stokMin.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.satuan}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      Rp {b.hargaSatuan.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      Rp {(b.stok * b.hargaSatuan).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3"><StokBadge stok={b.stok} stokMin={b.stokMin} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setModalView(b)} title="Lihat" className="rounded-lg p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground hover:text-blue-500 transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setModalEdit(b)} title="Edit" className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setModalDelete(b)} title="Hapus" className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {data.length} bahan baku
          </p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50">Sebelumnya</button>
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent">Selanjutnya</button>
          </div>
        </div>
      </div>

      <TambahBahanModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAdd} mode="tambah" />
      <TambahBahanModal open={!!modalEdit} onClose={() => setModalEdit(null)} onSubmit={handleEdit}
        initial={modalEdit ? { nama: modalEdit.nama, kategori: modalEdit.kategori, satuan: modalEdit.satuan, stok: String(modalEdit.stok), stokMin: String(modalEdit.stokMin), hargaSatuan: String(modalEdit.hargaSatuan), keterangan: modalEdit.keterangan } : undefined}
        mode="edit" key={modalEdit?.id ?? "edit"} />
      <ViewBahanModal open={!!modalView} onClose={() => setModalView(null)} b={modalView} />
      <DeleteBahanModal open={!!modalDelete} onClose={() => setModalDelete(null)}
        onConfirm={handleDelete} nama={modalDelete?.nama ?? ""} />
    </div>
  );
}