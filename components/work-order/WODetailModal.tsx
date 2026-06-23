"use client";

import { useState } from "react";
import { Pencil, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WorkOrder,
  Product,
  ProductionUnit,
  AppUser,
} from "@/lib/firestore";
import { StatusBadge, PriorBadge, PRIORITAS_CFG } from "./work-order-shared";
import { TahapProduksiPanel } from "@/components/tahapproduksi/TahapProduksiPanel";

type TabId = "info" | "tahap";

export function WODetailModal({
  wo,
  products,
  units,
  operators,
  onClose,
  onEdit,
}: {
  wo: WorkOrder;
  products: Product[];
  units: ProductionUnit[];
  operators: AppUser[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<TabId>("info");

  const prod = products.find((p) => p.id === wo.productId);
  const unit = units.find((u) => u.id === wo.unitId);
  const op = operators.find((u) => u.id === wo.operatorId);
  const pct =
    wo.jumlahTarget > 0
      ? Math.round((wo.jumlahSelesai / wo.jumlahTarget) * 100)
      : 0;
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
              {op && (
                <>
                  {" "}
                  · PIC: <span className="font-medium">{op.nama}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border p-1.5 hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-border">
          {(
            [
              { id: "info", label: "Informasi WO" },
              { id: "tahap", label: "Tahap Produksi" },
            ] as { id: TabId; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2",
                tab === t.id
                  ? "border-[#003247] text-[#003247]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Konten */}
        <div className="overflow-y-auto max-h-[65vh]">
          {tab === "info" && (
            <div className="px-6 py-5 space-y-5">
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
                    <AlertTriangle className="h-3 w-3" />
                    {wo.jumlahCacat.toLocaleString("id-ID")} unit cacat
                  </p>
                )}
              </div>

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
                        : `${Math.max(0, sisaHari)} hari`),
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

              <div className="space-y-2.5">
                {[
                  {
                    label: "PIC / Operator",
                    value: op?.nama ?? wo.operatorId ?? "—",
                  },
                  { label: "Unit Produksi", value: unit?.nama ?? wo.unitId },
                  {
                    label: "Prioritas",
                    value: PRIORITAS_CFG[wo.prioritas].label,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {wo.catatan && (
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Catatan
                  </p>
                  <p className="text-xs">{wo.catatan}</p>
                </div>
              )}
            </div>
          )}

          {tab === "tahap" && wo.id && (
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground mb-4">
                Data diperbarui otomatis saat PIC menyimpan progress dari HP.
              </p>
              <TahapProduksiPanel woId={wo.id} jumlahTarget={wo.jumlahTarget} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
