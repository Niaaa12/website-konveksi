"use client";

import React, { useState } from "react";
import { Material, Product, ProductVariant } from "@/lib/firestore";
import { InventoryValuationReport } from "./types";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Boxes,
  Package,
  AlertTriangle,
  DollarSign,
  Layers,
  Search,
  Building2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LaporanPersediaanTabProps {
  materials: Material[];
  products: Product[];
  variantsMap: Record<string, ProductVariant[]>;
  valuation: InventoryValuationReport;
}

export function LaporanPersediaanTab({
  materials,
  products,
  variantsMap,
  valuation,
}: LaporanPersediaanTabProps) {
  const [subTab, setSubTab] = useState<"bahan" | "produk">("bahan");
  const [searchFilter, setSearchFilter] = useState("");

  // Filter materials
  const filteredMaterials = materials.filter(
    (m) =>
      m.nama.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.kode.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Flatten all product variants
  const allFinishedVariants: Array<{
    productId: string;
    productName: string;
    variantId: string;
    warna: string;
    ukuran: string;
    stokGudangBesar: number;
    stokGudangPacking: number;
    stokMin: number;
  }> = [];

  products.forEach((p) => {
    const vars = variantsMap[p.id!] || [];
    vars.forEach((v) => {
      allFinishedVariants.push({
        productId: p.id!,
        productName: p.nama,
        variantId: v.id!,
        warna: v.namaWarna,
        ukuran: v.ukuran,
        stokGudangBesar: v.stokJadi || 0,
        stokGudangPacking: v.stokGudangPacking || 0,
        stokMin: v.stokMin || 20,
      });
    });
  });

  const filteredVariants = allFinishedVariants.filter(
    (v) =>
      v.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      v.warna.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Nilai Persediaan Bahan Baku"
          value={`Rp ${valuation.totalNilaiMaterial.toLocaleString("id-ID")}`}
          subtitle={`${valuation.totalMaterialAktif} jenis bahan aktif`}
          icon={Boxes}
          iconBg="bg-blue-100 text-blue-700"
          trend="up"
          trendValue="Bahan Baku"
        />
        <StatCard
          title="Stok Bahan Kritis"
          value={String(valuation.totalMaterialKritis)}
          subtitle="Bahan di bawah batas min"
          icon={AlertTriangle}
          iconBg={valuation.totalMaterialKritis > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          trend={valuation.totalMaterialKritis > 0 ? "down" : "up"}
          trendValue="Status"
        />
        <StatCard
          title="Stok Produk Jadi Gudang Besar"
          value={`${valuation.totalStokGudangBesar.toLocaleString("id-ID")} pcs`}
          subtitle="Gudang Utama Produksi"
          icon={Building2}
          iconBg="bg-purple-100 text-purple-700"
          trend="neutral"
          trendValue="Gudang Besar"
        />
        <StatCard
          title="Stok Produk Jadi Gudang Packing"
          value={`${valuation.totalStokGudangPacking.toLocaleString("id-ID")} pcs`}
          subtitle={`${valuation.totalVarianKritisPacking} varian kritis packing`}
          icon={Truck}
          iconBg="bg-teal-100 text-teal-700"
          trend="neutral"
          trendValue="Gudang Packing"
        />
      </div>

      {/* Toggle Sub-tab & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("bahan")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              subTab === "bahan"
                ? "bg-[#003247] text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="h-4 w-4" /> Stok Bahan Baku ({materials.length})
          </button>
          <button
            onClick={() => setSubTab("produk")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              subTab === "produk"
                ? "bg-[#003247] text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" /> Stok Produk Jadi ({allFinishedVariants.length} Varian)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter item persediaan..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>
      </div>

      {/* Sub-tab 1: Bahan Baku Table */}
      {subTab === "bahan" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Laporan Persediaan Bahan Baku
            </h3>
            <span className="text-xs text-muted-foreground">
              Nilai Total Aset: <strong>Rp {valuation.totalNilaiMaterial.toLocaleString("id-ID")}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">Kode</th>
                  <th className="py-3 px-4 font-semibold">Nama Bahan Baku</th>
                  <th className="py-3 px-4 font-semibold">Satuan</th>
                  <th className="py-3 px-4 font-semibold text-right">Stok Aktual</th>
                  <th className="py-3 px-4 font-semibold text-right">Stok Min</th>
                  <th className="py-3 px-4 font-semibold text-right">Harga Satuan</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Nilai (Rp)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredMaterials.map((m) => {
                  const nilaiTotal = m.stokAktual * m.harga;
                  const isKritis = m.stokAktual <= m.stokMin;
                  const isHabis = m.stokAktual <= 0;

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {m.kode}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {m.nama}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {m.satuan}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {m.stokAktual.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {m.stokMin.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        Rp {m.harga.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        Rp {nilaiTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            isHabis
                              ? "bg-red-100 text-red-700"
                              : isKritis
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {isHabis ? "Habis" : isKritis ? "Kritis" : "Aman"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                      Tidak ada bahan baku yang sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Produk Jadi Table */}
      {subTab === "produk" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Laporan Stok Produk Jadi Per Varian Warna & Ukuran
            </h3>
            <span className="text-xs text-muted-foreground">
              Total Gudang Besar: <strong>{valuation.totalStokGudangBesar} pcs</strong> | Gudang Packing: <strong>{valuation.totalStokGudangPacking} pcs</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">Nama Produk</th>
                  <th className="py-3 px-4 font-semibold">Varian Warna</th>
                  <th className="py-3 px-4 font-semibold">Ukuran</th>
                  <th className="py-3 px-4 font-semibold text-right">Stok Gudang Besar</th>
                  <th className="py-3 px-4 font-semibold text-right">Stok Gudang Packing</th>
                  <th className="py-3 px-4 font-semibold text-right">Stok Min Packing</th>
                  <th className="py-3 px-4 font-semibold text-center">Status Packing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredVariants.map((v) => {
                  const isKritisPacking = v.stokGudangPacking < v.stokMin;
                  return (
                    <tr key={`${v.productId}-${v.variantId}`} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {v.productName}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {v.warna}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {v.ukuran}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {v.stokGudangBesar.toLocaleString("id-ID")} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-blue-600">
                        {v.stokGudangPacking.toLocaleString("id-ID")} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {v.stokMin} pcs
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                            isKritisPacking
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {isKritisPacking ? "Perlu Transfer" : "Aman"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredVariants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                      Tidak ada varian produk jadi yang sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
