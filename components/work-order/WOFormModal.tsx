"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X, Check, AlertCircle } from "lucide-react";
import type { WorkOrder, WoStatus, WoPrioritas, Product, ProductionUnit, AppUser } from "@/lib/firestore";
import { STATUS_CFG } from "./work-order-shared";

export interface WOFormData {
  nomor: string; productId: string; variantId: string;
  jumlahTarget: number; status: WoStatus; prioritas: WoPrioritas;
  unitId: string; operatorId: string;
  tanggalMulai: string; tanggalTarget: string; catatan: string;
}

const EMPTY_WO: WOFormData = {
  nomor: "", productId: "", variantId: "", jumlahTarget: 0,
  status: "dijadwalkan", prioritas: "normal", unitId: "", operatorId: "",
  tanggalMulai: "", tanggalTarget: "", catatan: "",
};

export function WOFormModal({ initial, products, units, operators, onClose, onSave }: {
  initial?: WorkOrder;
  products: Product[]; units: ProductionUnit[]; operators: AppUser[];
  onClose: () => void;
  onSave: (data: WOFormData, id?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<WOFormData>(initial ? {
    nomor: initial.nomor, productId: initial.productId,
    variantId: initial.variantId ?? "", jumlahTarget: initial.jumlahTarget,
    status: initial.status, prioritas: initial.prioritas,
    unitId: initial.unitId, operatorId: initial.operatorId ?? "",
    tanggalMulai: initial.tanggalMulai, tanggalTarget: initial.tanggalTarget,
    catatan: initial.catatan,
  } : { ...EMPTY_WO, nomor: `WO-${Date.now().toString().slice(-6)}` });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof WOFormData, v: any) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomor || !form.productId || !form.unitId || !form.tanggalMulai || !form.tanggalTarget) {
      setError("Nomor WO, produk, unit, dan tanggal wajib diisi."); return;
    }
    if (form.tanggalTarget < form.tanggalMulai) { setError("Tanggal target tidak boleh sebelum tanggal mulai."); return; }
    if (form.jumlahTarget <= 0) { setError("Jumlah target harus lebih dari 0."); return; }
    setSaving(true); setError("");
    try { await onSave(form, initial?.id); onClose(); }
    catch (err: any) { setError(err.message ?? "Terjadi kesalahan."); }
    finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">{isEdit ? "Edit Work Order" : "Buat Work Order Baru"}</h2>
          <button onClick={onClose} className="rounded-lg border border-border p-1.5 hover:bg-muted/50"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Nomor WO <span className="text-red-500">*</span></label>
                <input value={form.nomor} onChange={e => set("nomor", e.target.value)} placeholder="WO-2505-006" className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Prioritas</label>
                <select value={form.prioritas} onChange={e => set("prioritas", e.target.value as WoPrioritas)} className={inputClass}>
                  <option value="rendah">Rendah</option>
                  <option value="normal">Normal</option>
                  <option value="tinggi">Tinggi</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Produk <span className="text-red-500">*</span></label>
              <select value={form.productId} onChange={e => set("productId", e.target.value)} className={inputClass}>
                <option value="">Pilih produk</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.kode ? `${p.kode} — ${p.nama}` : p.nama}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Unit Produksi <span className="text-red-500">*</span></label>
                <select value={form.unitId} onChange={e => set("unitId", e.target.value)} className={inputClass}>
                  <option value="">Pilih unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Operator / PIC</label>
                <select value={form.operatorId} onChange={e => set("operatorId", e.target.value)} className={inputClass}>
                  <option value="">Pilih operator</option>
                  {operators.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Jumlah Target (pcs) <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.jumlahTarget} onChange={e => set("jumlahTarget", Number(e.target.value))} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Tanggal Mulai <span className="text-red-500">*</span></label>
                <input type="date" value={form.tanggalMulai} onChange={e => set("tanggalMulai", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Target Selesai <span className="text-red-500">*</span></label>
                <input type="date" value={form.tanggalTarget} onChange={e => set("tanggalTarget", e.target.value)} className={inputClass} />
              </div>
            </div>
            {isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-medium">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(STATUS_CFG) as WoStatus[]).map(s => {
                    const cfg = STATUS_CFG[s]; const Icon = cfg.icon;
                    return (
                      <button key={s} type="button" onClick={() => set("status", s)}
                        className={cn("flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all",
                          form.status === s ? "border-[#003247] bg-[#003247]/5 ring-1 ring-[#003247]/30" : "border-border hover:bg-muted/40")}>
                        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", form.status === s ? "text-[#003247]" : "text-muted-foreground")} />
                        <span className={cn("text-[11px] font-medium", form.status === s ? "text-[#003247]" : "")}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium">Catatan</label>
              <textarea value={form.catatan} onChange={e => set("catatan", e.target.value)} rows={2}
                placeholder="Catatan tambahan..." className={cn(inputClass, "resize-none")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50">Batal</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isEdit ? "Simpan" : "Buat WO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}