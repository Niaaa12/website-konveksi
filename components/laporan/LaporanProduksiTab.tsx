"use client";

import React from "react";
import { WorkOrder, ProductionUnit, AppUser, TAHAP_CONFIG, URUTAN_TAHAP, TahapId } from "@/lib/firestore";
import { ProductionStageReport } from "./types";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Scissors,
  Layers,
  Sparkles,
  Package,
  Zap,
  BarChart2,
  AlertTriangle,
  Factory,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface LaporanProduksiTabProps {
  workOrders: WorkOrder[];
  units: ProductionUnit[];
  operators: AppUser[];
  stageReports: ProductionStageReport[];
}

const STAGE_ICONS: Record<string, any> = {
  potong: Scissors,
  jahit: Layers,
  obras: Layers,
  finishing: Sparkles,
  packing: Package,
};

export function LaporanProduksiTab({
  workOrders,
  units,
  operators,
  stageReports,
}: LaporanProduksiTabProps) {
  // Chart Data: Input vs Selesai vs Cacat per Tahap
  const stageChartData = stageReports.map((s) => ({
    name: s.tahap,
    selesai: s.totalSelesai,
    cacat: s.totalCacat,
    defectRate: s.defectRate,
  }));

  // Calculate Unit efficiency stats
  const activeUnitsCount = units.filter((u) => u.status === "aktif").length;
  const avgEfficiency =
    units.length > 0
      ? Math.round(units.reduce((acc, u) => acc + (u.efisiensi || 0), 0) / units.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* 5 Stages KPI Grid */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ringkasan Per Tahap Produksi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stageReports.map((stg) => {
            const IconComponent = STAGE_ICONS[stg.tahap.toLowerCase()] || Layers;
            return (
              <div
                key={stg.tahap}
                className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <IconComponent className="h-3.5 w-3.5 text-[#003247]" /> {stg.tahap}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full",
                      stg.defectRate > 3
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    Defect {stg.defectRate}%
                  </span>
                </div>

                <div className="space-y-1 my-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">WO Aktif:</span>
                    <span className="font-semibold text-foreground">{stg.jumlahWO} WO</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Hasil Selesai:</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {stg.totalSelesai.toLocaleString("id-ID")} pcs
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Jumlah Cacat:</span>
                    <span className="font-mono font-medium text-red-500">
                      {stg.totalCacat} pcs
                    </span>
                  </div>
                </div>

                {stg.jumlahKendala > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>{stg.jumlahKendala} Kendala dilaporkan</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Chart: Stage Output & Defects */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#003247]" /> Output & Tingkat Defect Per Tahap Produksi
            </h3>
            <p className="text-xs text-muted-foreground">
              Analisis throughput dan titik bottleneck per alur produksi
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              formatter={(val: number) => `${val.toLocaleString("id-ID")} pcs`}
              contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
            />
            <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="selesai" name="Hasil Selesai (pcs)" fill="#003247" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cacat" name="Jumlah Cacat (pcs)" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Unit Produksi Performance Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Factory className="h-4 w-4 text-[#003247]" /> Performa & Efisiensi Unit Produksi ({units.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Rata-rata efisiensi unit: <strong className="text-emerald-600 font-semibold">{avgEfficiency}%</strong> ({activeUnitsCount} unit aktif)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold">Kode Unit</th>
                <th className="py-3 px-4 font-semibold">Nama Unit Mesin</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Efisiensi Score</th>
                <th className="py-3 px-4 font-semibold text-right font-mono">Total WO Ditangani</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {units.map((unit) => {
                const totalWOUnit = workOrders.filter((w) => w.unitId === unit.id).length;
                return (
                  <tr key={unit.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {unit.kode}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {unit.nama}
                    </td>
                    <td className="py-3 px-4 capitalize text-muted-foreground">
                      {unit.kategori}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                          unit.status === "aktif"
                            ? "bg-emerald-100 text-emerald-700"
                            : unit.status === "maintenance"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              unit.efisiensi >= 80
                                ? "bg-emerald-500"
                                : unit.efisiensi >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, unit.efisiensi || 0)}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-foreground">
                          {unit.efisiensi || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                      {totalWOUnit} WO
                    </td>
                  </tr>
                );
              })}
              {units.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    Tidak ada data Unit Produksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
