"use client";

import React from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Factory,
  CheckCircle,
  AlertTriangle,
  Package,
  ArrowLeftRight,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  ShieldAlert,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  WorkOrder,
  Material,
  Product,
  ProductVariant,
  WarehouseTransfer,
  ProductOutflow,
} from "@/lib/firestore";
import { WOSummaryReport, InventoryValuationReport, WarehouseMutationReport } from "./types";
import { cn } from "@/lib/utils";

const COLORS = ["#003247", "#10b981", "#f59e0b", "#64748b", "#ef4444"];

interface LaporanRingkasanTabProps {
  workOrders: WorkOrder[];
  materials: Material[];
  products: Product[];
  transfers: WarehouseTransfer[];
  outflows: ProductOutflow[];
  variantsMap: Record<string, ProductVariant[]>;
  woSummary: WOSummaryReport;
  inventoryValuation: InventoryValuationReport;
  mutationSummary: WarehouseMutationReport;
}

export function LaporanRingkasanTab({
  workOrders,
  materials,
  products,
  transfers,
  outflows,
  variantsMap,
  woSummary,
  inventoryValuation,
  mutationSummary,
}: LaporanRingkasanTabProps) {
  // Chart Data 1: WO Status Distribution
  const woStatusChartData = [
    { name: "Selesai", value: woSummary.selesai, color: "#10b981" },
    { name: "Berjalan", value: woSummary.berjalan, color: "#003247" },
    { name: "Tertunda", value: woSummary.tertunda, color: "#f59e0b" },
    { name: "Dijadwalkan", value: woSummary.dijadwalkan, color: "#64748b" },
    { name: "Batal", value: woSummary.batal, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Chart Data 2: Top Products by Output Target
  const topProductsMap: Record<string, { nama: string; target: number; selesai: number }> = {};
  workOrders.forEach((wo) => {
    const p = products.find((prod) => prod.id === wo.productId);
    const name = p ? p.nama : "Lainnya";
    if (!topProductsMap[name]) {
      topProductsMap[name] = { nama: name, target: 0, selesai: 0 };
    }
    topProductsMap[name].target += wo.jumlahTarget;
    topProductsMap[name].selesai += wo.jumlahSelesai;
  });
  const productOutputChartData = Object.values(topProductsMap).slice(0, 6);

  // Critical items highlights
  const criticalMaterials = materials.filter(
    (m) => m.stokAktual <= m.stokMin
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Work Order"
          value={String(woSummary.totalWO)}
          subtitle={`Pencapaian: ${woSummary.persentasePencapaian}%`}
          icon={Factory}
          iconBg="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          trend="neutral"
          trendValue="WO"
        />
        <StatCard
          title="Total Output Selesai"
          value={`${woSummary.totalSelesai.toLocaleString("id-ID")} pcs`}
          subtitle={`Target: ${woSummary.totalTarget.toLocaleString("id-ID")} pcs`}
          icon={CheckCircle}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
          trend="up"
          trendValue="Output"
        />
        <StatCard
          title="Tingkat Defect (Cacat)"
          value={`${woSummary.persentaseDefect}%`}
          subtitle={`Total Cacat: ${woSummary.totalCacat} pcs`}
          icon={AlertTriangle}
          iconBg={woSummary.persentaseDefect > 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}
          trend={woSummary.persentaseDefect > 5 ? "down" : "neutral"}
          trendValue="Kualitas"
        />
        <StatCard
          title="Nilai Aset Persediaan"
          value={`Rp ${(inventoryValuation.totalNilaiMaterial / 1000000).toFixed(1)} jt`}
          subtitle={`Bahan: Rp ${(inventoryValuation.totalNilaiMaterial).toLocaleString("id-ID")}`}
          icon={Package}
          iconBg="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
          trend="up"
          trendValue="Aset"
        />
        <StatCard
          title="Aktivitas Mutasi"
          value={String(mutationSummary.totalTransferGudang + mutationSummary.totalPengeluaranProduk)}
          subtitle={`${mutationSummary.totalTransferGudang} Trf | ${mutationSummary.totalPengeluaranProduk} Keluar`}
          icon={ArrowLeftRight}
          iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300"
          trend="neutral"
          trendValue="Gudang"
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Output Produksi per Produk */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[#003247]" /> Output Produksi per Produk
              </h3>
              <p className="text-xs text-muted-foreground">
                Perbandingan target vs realisasi selesai (unit)
              </p>
            </div>
          </div>

          <div className="w-full">
            {productOutputChartData.length === 0 ? (
              <div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground">
                Belum ada data produksi untuk filter ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={productOutputChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="nama" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: number) => `${val.toLocaleString("id-ID")} pcs`}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="target" name="Target Output" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="selesai" name="Realisasi Selesai" fill="#003247" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <PieIcon className="h-4 w-4 text-[#003247]" /> Status Work Order
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Distribusi status WO sesuai filter
            </p>
          </div>

          <div className="flex justify-center items-center my-auto">
            {woStatusChartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                Tidak ada data WO
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={woStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {woStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} WO`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>Total WO: <strong className="text-foreground">{woSummary.totalWO}</strong></span>
            <span>Completion: <strong className="text-emerald-600 font-semibold">{woSummary.persentasePencapaian}%</strong></span>
          </div>
        </div>
      </div>

      {/* Highlights Tables: Active Work Orders & Critical Stocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Active Work Orders */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#003247]" /> Work Order Berjalan & Tertunda
            </h3>
            <span className="text-xs font-mono bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
              {workOrders.filter((w) => w.status === "berjalan" || w.status === "tertunda").length} aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left pb-2">
                  <th className="pb-2 font-medium">No. WO</th>
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 font-medium text-right">Target</th>
                  <th className="pb-2 font-medium text-right">Hasil</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {workOrders
                  .filter((w) => w.status === "berjalan" || w.status === "tertunda" || w.status === "dijadwalkan")
                  .slice(0, 5)
                  .map((wo) => {
                    const prod = products.find((p) => p.id === wo.productId);
                    return (
                      <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-mono font-medium text-foreground">{wo.nomor}</td>
                        <td className="py-2.5 max-w-[140px] truncate">{prod ? prod.nama : "Produk"}</td>
                        <td className="py-2.5 text-right font-mono">{wo.jumlahTarget}</td>
                        <td className="py-2.5 text-right font-mono text-emerald-600 font-semibold">{wo.jumlahSelesai}</td>
                        <td className="py-2.5 text-center">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              wo.status === "berjalan"
                                ? "bg-emerald-100 text-emerald-700"
                                : wo.status === "tertunda"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {wo.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                {workOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Tidak ada Work Order sesuai filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Raw Materials */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Bahan Baku Stok Rendah / Kritis
            </h3>
            <span className="text-xs font-mono bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-md font-semibold">
              {criticalMaterials.length} Item
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left pb-2">
                  <th className="pb-2 font-medium">Bahan Baku</th>
                  <th className="pb-2 font-medium text-right">Stok Saat Ini</th>
                  <th className="pb-2 font-medium text-right">Stok Min</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {criticalMaterials.slice(0, 5).map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium text-foreground">{m.nama}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-amber-600">
                      {m.stokAktual} {m.satuan}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground">
                      {m.stokMin} {m.satuan}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold">
                        {m.stokAktual <= 0 ? "Habis" : "Kritis"}
                      </span>
                    </td>
                  </tr>
                ))}
                {criticalMaterials.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-emerald-600 font-medium">
                      Semua stok bahan baku berada pada tingkat aman.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
