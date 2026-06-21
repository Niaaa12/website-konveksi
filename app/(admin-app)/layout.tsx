"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/Topbar";
import { usePathname } from "next/navigation";
import { useState } from "react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Ringkasan Produksi Hari Ini" },
  "/produksi/work-order": {
    title: "Work Order",
    subtitle: "Kelola & pantau pesanan produksi",
  },
  "/produksi/jadwal": {
    title: "Jadwal Produksi",
    subtitle: "Kelola work order, pantau progress, dan lihat timeline produksi",
  },
  "/unitproduksi": {
    title: "Status Unit Produksi",
    subtitle:
      "Kelola unit kerja produksi, kapasitas, dan aktivitas operasional",
  },
  "/persediaan/bahan-baku": {
    title: "Bahan Baku",
    subtitle: "Kelola stok & informasi bahan baku",
  },
  "/persediaan/penerimaan": {
    title: "Penerimaan Bahan",
    subtitle: "Catat penerimaan bahan baku dari supplier",
  },
  "/persediaan/pengeluaran": {
    title: "Pengeluaran Bahan",
    subtitle: "Catat pengeluaran bahan ke lantai produksi",
  },
  "/pengguna": {
    title: "Manajemen Pengguna",
    subtitle: "Kelola akun & hak akses tim",
  },
  "/laporan": {
    title: "Laporan",
    subtitle: "Laporan Produksi & Stok",
  },
  "/katalogproduk": {
    title: "Katalog Produk",
    subtitle: "Daftar produk & desain yang tersedia",
  },
  "/pengaturan": {
    title: "Pengaturan",
    subtitle: "Konfigurasi sistem",
  },
};

export default function Applayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] ?? { title: "Halaman", subtitle: "" };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
