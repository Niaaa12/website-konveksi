"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import {
  AlertTriangle,
  ArrowRight,
  Factory,
  Link,
  Package,
  TrendingUp,
  Zap,
} from "lucide-react";


export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Alert Kritis */}
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Bahan Baku Stok Kritis
          </p>
          <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
            segera lakukan pemesanan
          </p>
        </div>
        <Link
          href=""
          className="flex-shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
        >
          Lihat <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Produksi"
          value=""
          subtitle=""
          icon={Factory}
          iconBg="bg-blue-100"
          trend="up"
          trendValue=""
        />
        <StatCard
          title="Efisiensi Produksi"
          value=""
          subtitle=""
          icon={Zap}
          iconBg="bg-emerald-100"
          trend="up"
          trendValue=""
        />
        <StatCard
          title="Nilai Persediaan"
          value=""
          subtitle=""
          icon={Package}
          iconBg="bg-violet-100"
          trend="up"
          trendValue=""
        />
        <StatCard
          title="Work Order Aktif"
          value=""
          subtitle=""
          icon={TrendingUp}
          iconBg="bg-amber-100"
          trend="neutral"
          trendValue=""
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
              href=""
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Laporan lengkap <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {/* Distribusi Persediaan */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Distribusi Persediaan</h2>
            <p className="text-xs text-muted-foreground">
              Berdasarkan kategori bahan
            </p>
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
              href=""
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        {/* Stok Kritis */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Status Stok Bahan Baku</h2>
            <Link
              href=""
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
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
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              
            </div>
            
            
            
          </div>
        </div>
      </div>
    </div>
  );
}
