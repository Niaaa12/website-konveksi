"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import {
  AlertTriangle,
  ArrowRight,
  Factory,
  Package,
  TrendingUp,
  Zap,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getDashboardStats, getMaterials, getProductionUnits, getWorkOrders, getProducts, ProductionUnit } from "@/lib/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#003247", "#005577", "#0088cc", "#33aaff", "#88ccff", "#b3e0ff"];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Berjalan: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Selesai: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    Tertunda: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    Dijadwalkan: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium", map[status] ?? "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}

function StokBadge({ stok, stokMin }: { stok: number; stokMin: number }) {
  if (stok <= 0)
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"><span className="h-1 w-1 rounded-full bg-red-500" />Habis</span>;
  if (stok <= stokMin)
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"><span className="h-1 w-1 rounded-full bg-amber-500" />Kritis</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><span className="h-1 w-1 rounded-full bg-emerald-500" />Aman</span>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    woAktif: 0,
    woTertunda: 0,
    woDijadwalkan: 0,
    stokKritis: 0,
    totalProgress: 0,
    totalTarget: 0,
  });
  const [nilaiPersediaan, setNilaiPersediaan] = useState(0);
  const [efisiensiProd, setEfisiensiProd] = useState(0);
  const [recentWos, setRecentWos] = useState<any[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<ProductionUnit[]>([]);
  const [distData, setDistData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [dashStats, materials, units, wos, prods] = await Promise.all([
          getDashboardStats(),
          getMaterials(),
          getProductionUnits(),
          getWorkOrders(),
          getProducts(),
        ]);

        setStats(dashStats);
        setUnitsList(units);

        // Sum inventory value
        const totalVal = materials.reduce((sum, m) => sum + (m.stokAktual * m.harga), 0);
        setNilaiPersediaan(totalVal);

        // Average efficiency
        const avgEff = units.length > 0
          ? Math.round(units.reduce((sum, u) => sum + u.efisiensi, 0) / units.length)
          : 0;
        setEfisiensiProd(avgEff);

        // Map recent 5 WOs
        const mappedWos = wos.slice(0, 5).map(wo => {
          const prod = prods.find(p => p.id === wo.productId);
          return {
            id: wo.id || "",
            produk: prod ? prod.nama : "Produk Tidak Dikenal",
            target: wo.jumlahTarget,
            status: wo.status.charAt(0).toUpperCase() + wo.status.slice(1),
          };
        });
        setRecentWos(mappedWos);

        // Map top 5 materials
        const mappedMaterials = materials.slice(0, 5).map(m => ({
          id: m.id || "",
          nama: m.nama,
          stok: m.stokAktual,
          stokMin: m.stokMin,
          satuan: m.satuan,
        }));
        setRecentMaterials(mappedMaterials);

        // Distribution by category
        const categories = ["Kain", "Benang", "Aksesori", "Pewarna", "Kemasan", "Lainnya"];
        const distribution = categories.map(cat => {
          const filtered = materials.filter(m => {
            const mCat = m.kategoriId.startsWith("cat-") ? m.kategoriId.replace("cat-", "") : m.kategoriId;
            return mCat.toLowerCase().includes(cat.toLowerCase().substring(0, 4));
          });
          const value = filtered.reduce((sum, m) => sum + (m.stokAktual * m.harga), 0);
          return { name: cat, value };
        }).filter(d => d.value > 0);
        setDistData(distribution);

      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = [
    { name: "Des", target: 4000, aktual: 3800 },
    { name: "Jan", target: 4500, aktual: 4200 },
    { name: "Feb", target: 5000, aktual: 4900 },
    { name: "Mar", target: 5500, aktual: 5100 },
    { name: "Apr", target: 6000, aktual: 5800 },
    { name: "Mei", target: stats.totalTarget || 5000, aktual: stats.totalProgress || 4500 },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Kritis */}
      {stats.stokKritis > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Bahan Baku Stok Kritis!
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
              Ada {stats.stokKritis} jenis bahan baku yang berada di bawah stok minimum. Segera lakukan pemesanan ulang.
            </p>
          </div>
          <Link
            href="/persediaan/bahan-baku"
            className="flex-shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            Lihat <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Produksi"
          value={stats.totalProgress.toLocaleString("id-ID")}
          subtitle={`Target: ${stats.totalTarget.toLocaleString("id-ID")}`}
          icon={Factory}
          iconBg="bg-blue-100"
          trend="up"
          trendValue="Aktif"
        />
        <StatCard
          title="Efisiensi Produksi"
          value={`${efisiensiProd}%`}
          subtitle="Rata-rata mesin"
          icon={Zap}
          iconBg="bg-emerald-100"
          trend="up"
          trendValue="Optimum"
        />
        <StatCard
          title="Nilai Persediaan"
          value={`Rp ${nilaiPersediaan.toLocaleString("id-ID")}`}
          subtitle="Nilai aset gudang"
          icon={Package}
          iconBg="bg-violet-100"
          trend="up"
          trendValue="Gudang"
        />
        <StatCard
          title="Work Order Aktif"
          value={String(stats.woAktif)}
          subtitle={`${stats.woDijadwalkan} Dijadwalkan, ${stats.woTertunda} Tertunda`}
          icon={TrendingUp}
          iconBg="bg-amber-100"
          trend="neutral"
          trendValue="Siklus"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tren Produksi */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold">Tren Produksi 6 Bulan</h2>
              <p className="text-xs text-muted-foreground">
                Target vs Aktual (unit)
              </p>
            </div>
            <Link
              href="/produksi/work-order"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat Work Order <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="w-full">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="target" name="Target" fill="#b3e0ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aktual" name="Aktual" fill="#003247" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Persediaan */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Distribusi Persediaan</h2>
            <p className="text-xs text-muted-foreground">
              Berdasarkan kategori bahan (nilai Rp)
            </p>
          </div>
          <div className="flex justify-center items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={distData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`} />
                <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Work Order Aktif */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Work Order Terkini</h2>
            <Link
              href="/produksi/work-order"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border pb-2">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Produk</th>
                    <th className="pb-2 text-right">Target</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentWos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">Tidak ada work order aktif</td>
                    </tr>
                  ) : (
                    recentWos.map(wo => (
                      <tr key={wo.id} className="text-xs hover:bg-muted/10">
                        <td className="py-2.5 font-mono text-muted-foreground">{wo.id}</td>
                        <td className="py-2.5 font-medium text-foreground">{wo.produk}</td>
                        <td className="py-2.5 text-right font-medium">{wo.target}</td>
                        <td className="py-2.5 text-center"><StatusBadge status={wo.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stok Kritis */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Status Stok Bahan Baku</h2>
            <Link
              href="/persediaan/bahan-baku"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border pb-2">
                    <th className="pb-2">Bahan Baku</th>
                    <th className="pb-2 text-right">Stok</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-xs text-muted-foreground">Tidak ada bahan baku</td>
                    </tr>
                  ) : (
                    recentMaterials.map(m => (
                      <tr key={m.id} className="text-xs hover:bg-muted/10">
                        <td className="py-2.5 font-medium text-foreground">{m.nama}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{m.stok.toLocaleString("id-ID")} {m.satuan}</td>
                        <td className="py-2.5 text-right"><StokBadge stok={m.stok} stokMin={m.stokMin} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Status Mesin */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Status Lini Produksi</h2>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Aktif
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Maintenance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" /> Idle
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {unitsList.length === 0 ? (
            <div className="p-5 col-span-4 text-center text-xs text-muted-foreground">Tidak ada lini produksi</div>
          ) : (
            unitsList.map(unit => (
              <div key={unit.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{unit.nama}</p>
                    <p className="text-xs text-muted-foreground">{unit.jenis}</p>
                  </div>
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    unit.status === "aktif" ? "bg-emerald-500" :
                    unit.status === "maintenance" ? "bg-amber-500" : "bg-gray-400"
                  )} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Efisiensi</span>
                    <span className="font-medium">{unit.efisiensi}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-[#003247] rounded-full" style={{ width: `${unit.efisiensi}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
