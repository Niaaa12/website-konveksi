"use client";

import React from "react";
import { WorkOrder, Product, ProductionUnit, AppUser } from "@/lib/firestore";
import { WOSummaryReport } from "./types";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertOctagon,
  Calendar,
  Layers,
  BarChart2,
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

interface LaporanWorkOrderTabProps {
  workOrders: WorkOrder[];
  products: Product[];
  units: ProductionUnit[];
  operators: AppUser[];
  summary: WOSummaryReport;
}

export function LaporanWorkOrderTab({
  workOrders,
  products,
  units,
  operators,
  summary,
}: LaporanWorkOrderTabProps) {
  // Chart Data: Top 10 WO Target vs Hasil
  const woChartData = workOrders.slice(0, 10).map((wo) => ({
    nomor: wo.nomor,
    target: wo.jumlahTarget,
    selesai: wo.jumlahSelesai,
    cacat: wo.jumlahCacat,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Work Order"
          value={String(summary.totalWO)}
          subtitle="Dalam periode filter"
          icon={ClipboardList}
          iconBg="bg-blue-100 text-blue-700"
          trend="neutral"
          trendValue="WO"
        />
        <StatCard
          title="WO Selesai"
          value={String(summary.selesai)}
          subtitle={`${summary.persentasePencapaian}% dari total`}
          icon={CheckCircle}
          iconBg="bg-emerald-100 text-emerald-700"
          trend="up"
          trendValue="Complete"
        />
        <StatCard
          title="WO Berjalan"
          value={String(summary.berjalan)}
          subtitle="Proses aktif"
          icon={Clock}
          iconBg="bg-cyan-100 text-cyan-700"
          trend="neutral"
          trendValue="Active"
        />
        <StatCard
          title="WO Tertunda"
          value={String(summary.tertunda)}
          subtitle="Membutuhkan perhatian"
          icon={AlertOctagon}
          iconBg="bg-amber-100 text-amber-700"
          trend={summary.tertunda > 0 ? "down" : "neutral"}
          trendValue="Pending"
        />
        <StatCard
          title="Total Output Realisasi"
          value={`${summary.totalSelesai.toLocaleString("id-ID")} pcs`}
          subtitle={`Target: ${summary.totalTarget.toLocaleString("id-ID")} pcs`}
          icon={Layers}
          iconBg="bg-purple-100 text-purple-700"
          trend="up"
          trendValue="Volume"
        />
      </div>

      {/* Target vs Realisasi Recharts */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#003247]" /> Target vs Realisasi Hasil Per Work Order
            </h3>
            <p className="text-xs text-muted-foreground">
              Visualisasi 10 Work Order teratas sesuai filter
            </p>
          </div>
        </div>

        {woChartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
            Tidak ada Work Order sesuai kriteria filter
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={woChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="nomor" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(val: number) => `${val.toLocaleString("id-ID")} pcs`}
                contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
              />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="target" name="Target Target" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="selesai" name="Hasil Selesai" fill="#003247" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cacat" name="Jumlah Cacat" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detailed Work Order Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Daftar Laporan Work Order ({workOrders.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            Menampilkan data sesuai filter
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold">Nomor WO</th>
                <th className="py-3 px-4 font-semibold">Produk</th>
                <th className="py-3 px-4 font-semibold">Unit Produksi</th>
                <th className="py-3 px-4 font-semibold">PIC / Operator</th>
                <th className="py-3 px-4 font-semibold text-right">Target</th>
                <th className="py-3 px-4 font-semibold text-right">Selesai</th>
                <th className="py-3 px-4 font-semibold text-right">Cacat</th>
                <th className="py-3 px-4 font-semibold text-center">Progress</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Tgl Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {workOrders.map((wo) => {
                const prod = products.find((p) => p.id === wo.productId);
                const unit = units.find((u) => u.id === wo.unitId);
                const pic = operators.find((op) => op.id === wo.operatorId);
                const pct =
                  wo.jumlahTarget > 0
                    ? Math.min(100, Math.round((wo.jumlahSelesai / wo.jumlahTarget) * 100))
                    : 0;

                return (
                  <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {wo.nomor}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {prod ? prod.nama : "Produk Tidak Dikenal"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {unit ? unit.nama : "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {pic ? pic.nama : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {wo.jumlahTarget.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                      {wo.jumlahSelesai.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-500">
                      {wo.jumlahCacat}
                    </td>
                    <td className="py-3 px-4 text-center min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct >= 100
                                ? "bg-blue-600"
                                : pct >= 50
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                          wo.status === "selesai"
                            ? "bg-blue-100 text-blue-700"
                            : wo.status === "berjalan"
                            ? "bg-emerald-100 text-emerald-700"
                            : wo.status === "tertunda"
                            ? "bg-amber-100 text-amber-700"
                            : wo.status === "batal"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {wo.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {wo.tanggalTarget || "-"}
                    </td>
                  </tr>
                );
              })}
              {workOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground text-xs">
                    Tidak ada data Work Order yang memenuhi kriteria filter.
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
