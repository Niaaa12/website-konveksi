"use client";

import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Eye,
  CheckCircle2,
  Calendar,
  Tag,
  Users,
  Factory,
  Boxes,
  Package,
  Truck,
  ArrowLeftRight,
} from "lucide-react";
import {
  WorkOrder,
  Material,
  Product,
  ProductVariant,
  WarehouseTransfer,
  ProductOutflow,
  ProductionUnit,
  AppUser,
  StockTransaction,
} from "@/lib/firestore";
import {
  LaporanFilterState,
  WOSummaryReport,
  InventoryValuationReport,
  WarehouseMutationReport,
  ProductionStageReport,
} from "./types";
import { downloadCSV, printDocument } from "./exportUtils";

interface LaporanExportTabProps {
  filterState: LaporanFilterState;
  workOrders: WorkOrder[];
  materials: Material[];
  products: Product[];
  units: ProductionUnit[];
  operators: AppUser[];
  transfers: WarehouseTransfer[];
  outflows: ProductOutflow[];
  variantsMap: Record<string, ProductVariant[]>;
  woSummary: WOSummaryReport;
  inventoryValuation: InventoryValuationReport;
  mutationSummary: WarehouseMutationReport;
  stageReports: ProductionStageReport[];
  materialTransactions?: StockTransaction[];
}

export function LaporanExportTab({
  filterState,
  workOrders,
  materials,
  products,
  units,
  operators,
  transfers,
  outflows,
  variantsMap,
  woSummary,
  inventoryValuation,
  mutationSummary,
  stageReports,
  materialTransactions = [],
}: LaporanExportTabProps) {
  const [reportType, setReportType] = useState<
    "semua" | "workorder" | "produksi" | "persediaan" | "mutasi"
  >("semua");

  // Flatten finished product variants for reports
  const finishedProductVariants = useMemo(() => {
    const list: Array<{
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
        list.push({
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
    return list;
  }, [products, variantsMap]);

  // Handler: Export Excel CSV
  const handleExportExcel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const exportRows: string[][] = [];

    // Header Meta Info
    exportRows.push(["SODAI GROUP KONVEKSI - LAPORAN OPERASIONAL"]);
    exportRows.push([`Tanggal Ekspor: ${today}`]);
    exportRows.push([`Kriteria Filter: ${getFilterSummaryText()}`]);
    exportRows.push([]);

    // 1. WORK ORDER REPORT
    if (reportType === "workorder" || reportType === "semua") {
      exportRows.push(["=== LAPORAN WORK ORDER PRODUKSI ==="]);
      const woHeaders = [
        "Nomor WO",
        "Produk",
        "Unit Produksi",
        "PIC / Operator",
        "Target (pcs)",
        "Selesai (pcs)",
        "Cacat (pcs)",
        "Defect Rate (%)",
        "Status",
        "Tanggal Mulai",
        "Tanggal Target",
      ];
      exportRows.push(woHeaders);

      workOrders.forEach((wo) => {
        const prod = products.find((p) => p.id === wo.productId);
        const unit = units.find((u) => u.id === wo.unitId);
        const pic = operators.find((op) => op.id === wo.operatorId);
        const defRate =
          wo.jumlahSelesai > 0
            ? ((wo.jumlahCacat / wo.jumlahSelesai) * 100).toFixed(1)
            : "0";

        exportRows.push([
          wo.nomor,
          prod ? prod.nama : "-",
          unit ? unit.nama : "-",
          pic ? pic.nama : "-",
          String(wo.jumlahTarget || 0),
          String(wo.jumlahSelesai || 0),
          String(wo.jumlahCacat || 0),
          `${defRate}%`,
          wo.status,
          wo.tanggalMulai || "-",
          wo.tanggalTarget || "-",
        ]);
      });

      // Total Row
      exportRows.push([
        "TOTAL WO / TOTAL REKAP",
        `Total: ${woSummary.totalWO} WO`,
        "-",
        "-",
        String(woSummary.totalTarget),
        String(woSummary.totalSelesai),
        String(woSummary.totalCacat),
        `${woSummary.persentaseDefect}%`,
        "-",
        "-",
        "-",
      ]);
      exportRows.push([]);
    }

    // 2. TAHAP PRODUKSI & UNIT REPORT
    if (reportType === "produksi" || reportType === "semua") {
      exportRows.push(["=== LAPORAN RINGKASAN TAHAP PRODUKSI ==="]);
      exportRows.push([
        "Tahap Produksi",
        "Jumlah WO",
        "Target Input (pcs)",
        "Hasil Selesai (pcs)",
        "Jumlah Cacat (pcs)",
        "Defect Rate (%)",
        "Jumlah Kendala",
      ]);
      stageReports.forEach((s) => {
        exportRows.push([
          s.tahap,
          String(s.jumlahWO),
          String(s.totalMasuk),
          String(s.totalSelesai),
          String(s.totalCacat),
          `${s.defectRate}%`,
          String(s.jumlahKendala),
        ]);
      });
      exportRows.push([]);

      exportRows.push(["=== LAPORAN PERFORMA & EFISIENSI UNIT PRODUKSI ==="]);
      exportRows.push([
        "Kode Unit",
        "Nama Unit Mesin",
        "Kategori",
        "Status",
        "Efisiensi Score (%)",
        "Total WO Ditangani",
      ]);
      units.forEach((u) => {
        const totalWOUnit = workOrders.filter((w) => w.unitId === u.id).length;
        exportRows.push([
          u.kode,
          u.nama,
          u.kategori || "-",
          u.status,
          `${u.efisiensi || 0}%`,
          String(totalWOUnit),
        ]);
      });
      exportRows.push([]);
    }

    // 3. PERSEDIAAN BAHAN BAKU & PRODUK JADI REPORT
    if (reportType === "persediaan" || reportType === "semua") {
      exportRows.push(["=== LAPORAN PERSEDIAAN BAHAN BAKU ==="]);
      exportRows.push([
        "Kode Material",
        "Nama Bahan Baku",
        "Satuan",
        "Stok Aktual",
        "Stok Minimum",
        "Harga Satuan (Rp)",
        "Nilai Total (Rp)",
        "Status Stok",
      ]);
      materials.forEach((m) => {
        exportRows.push([
          m.kode,
          m.nama,
          m.satuan,
          String(m.stokAktual),
          String(m.stokMin),
          String(m.harga),
          String(m.stokAktual * m.harga),
          m.stokAktual <= 0 ? "Habis" : m.stokAktual <= m.stokMin ? "Kritis" : "Aman",
        ]);
      });
      exportRows.push([
        "TOTAL NILAI BAHAN BAKU",
        "-",
        "-",
        "-",
        "-",
        "-",
        String(inventoryValuation.totalNilaiMaterial),
        "-",
      ]);
      exportRows.push([]);

      exportRows.push(["=== LAPORAN STOK PRODUK JADI PER VARIAN ==="]);
      exportRows.push([
        "Nama Produk",
        "Varian Warna",
        "Ukuran",
        "Stok Gudang Besar (pcs)",
        "Stok Gudang Packing (pcs)",
        "Stok Minimum (pcs)",
        "Status Stok Packing",
      ]);
      finishedProductVariants.forEach((v) => {
        exportRows.push([
          v.productName,
          v.warna,
          v.ukuran,
          String(v.stokGudangBesar),
          String(v.stokGudangPacking),
          String(v.stokMin),
          v.stokGudangPacking <= 0
            ? "Kosong"
            : v.stokGudangPacking < v.stokMin
            ? "Kritis"
            : "Aman",
        ]);
      });
      exportRows.push([]);
    }

    // 4. MUTASI GUDANG REPORT
    if (reportType === "mutasi" || reportType === "semua") {
      exportRows.push(["=== LAPORAN MUTASI TRANSFER GUDANG (UTAMA -> PACKING) ==="]);
      exportRows.push([
        "No. Transfer",
        "Nama Produk",
        "Varian Warna",
        "Ukuran",
        "Jumlah (pcs)",
        "Tanggal Transfer",
        "Dibuat Oleh",
      ]);
      transfers.forEach((tr) => {
        exportRows.push([
          tr.nomorTransfer,
          tr.productName,
          tr.warna,
          tr.ukuran,
          String(tr.jumlah),
          tr.tanggalTransfer || "-",
          tr.dibuatOleh,
        ]);
      });
      exportRows.push([]);

      exportRows.push(["=== LAPORAN MUTASI PENGELUARAN PRODUK JADI ==="]);
      exportRows.push([
        "No. Outflow",
        "Nama Produk",
        "Varian Warna",
        "Ukuran",
        "Jumlah (pcs)",
        "Nama Pelanggan / Toko",
        "Tanggal Outflow",
        "Dibuat Oleh",
      ]);
      outflows.forEach((out) => {
        exportRows.push([
          out.nomorOutflow,
          out.productName,
          out.warna,
          out.ukuran,
          String(out.jumlah),
          out.pelanggan || "-",
          out.tanggalOutflow || "-",
          out.dibuatOleh,
        ]);
      });
      exportRows.push([]);

      if (materialTransactions.length > 0) {
        exportRows.push(["=== LAPORAN MUTASI TRANSAKSI STOK BAHAN BAKU ==="]);
        exportRows.push([
          "Tanggal",
          "Bahan Baku",
          "Tipe Mutasi",
          "Jumlah Mutasi",
          "Referensi Tipe",
          "Ref ID",
          "Petugas",
          "Catatan",
        ]);
        materialTransactions.forEach((tx) => {
          const mat = materials.find((m) => m.id === tx.materialId);
          const tgl = tx.createdAt
            ? new Date(tx.createdAt).toLocaleDateString("id-ID")
            : "-";
          exportRows.push([
            tgl,
            mat ? mat.nama : tx.materialId,
            tx.jenis || (tx.jumlah > 0 ? "masuk" : "keluar"),
            String(tx.jumlah),
            tx.refTipe || "-",
            tx.refId || "-",
            tx.dilakukanOleh || "-",
            tx.catatan || "-",
          ]);
        });
        exportRows.push([]);
      }
    }

    const filenameMap: Record<string, string> = {
      semua: `Laporan_Operasional_Lengkap_${today}.csv`,
      workorder: `Laporan_WorkOrder_${today}.csv`,
      produksi: `Laporan_TahapProduksi_dan_Unit_${today}.csv`,
      persediaan: `Laporan_Persediaan_Bahan_dan_ProdukJadi_${today}.csv`,
      mutasi: `Laporan_Mutasi_Gudang_Lengkap_${today}.csv`,
    };

    downloadCSV(filenameMap[reportType] || `Laporan_${today}.csv`, exportRows);
  };

  // Handler: Print / PDF
  const handlePrint = () => {
    printDocument("printable-report-container");
  };

  const getFilterSummaryText = () => {
    const parts = [];
    if (filterState.presetTanggal !== "semua") {
      parts.push(
        `Periode: ${filterState.tanggalAwal || "Awal"} s/d ${
          filterState.tanggalAkhir || "Sekarang"
        }`
      );
    } else {
      parts.push("Periode: Semua Waktu");
    }
    if (filterState.productId !== "semua") {
      const p = products.find((pr) => pr.id === filterState.productId);
      parts.push(`Produk: ${p ? p.nama : filterState.productId}`);
    }
    if (filterState.status !== "semua") {
      parts.push(`Status: ${filterState.status}`);
    }
    if (filterState.unitId !== "semua") {
      const u = units.find((un) => un.id === filterState.unitId);
      parts.push(`Unit: ${u ? u.nama : filterState.unitId}`);
    }
    return parts.join(" | ");
  };

  return (
    <div className="space-y-6">
      {/* Config Export Controls */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#003247]" /> Pusat Ekspor & Cetak Laporan Operasional
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pilih jenis data laporan yang ingin Anda cetak atau unduh dalam format Excel (.csv) / Dokumen PDF yang terstruktur dan rapi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Options: Type of Report */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              1. Pilih Jenis Laporan
            </label>
            <div className="space-y-2">
              {[
                { id: "semua", label: "Laporan Lengkap (Semua Modul & Ringkasan)" },
                { id: "workorder", label: "Laporan Work Order Produksi" },
                { id: "produksi", label: "Laporan Tahap Produksi & Efisiensi Unit" },
                { id: "persediaan", label: "Laporan Persediaan Bahan Baku & Produk Jadi" },
                { id: "mutasi", label: "Laporan Mutasi Gudang (Transfer & Pengeluaran)" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => setReportType(opt.id as any)}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
                    reportType === opt.id
                      ? "border-[#003247] bg-[#003247]/5 font-semibold text-foreground"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === opt.id}
                    onChange={() => setReportType(opt.id as any)}
                    className="accent-[#003247]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export Action Card */}
          <div className="rounded-xl bg-muted/40 border border-border p-5 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Format Ekspor & Aksi
              </h4>
              <p className="text-xs text-muted-foreground">
                Data yang diekspor akan secara otomatis mengikuti filter yang aktif:
              </p>
              <div className="mt-2 rounded-lg bg-card p-2.5 border border-border text-[11px] text-foreground font-mono">
                {getFilterSummaryText()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" /> Unduh Excel (.csv)
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#003247] hover:bg-[#004a6e] text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Document Live Preview Panel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#003247]" /> Pratinjau Dokumen Laporan (Print Preview)
          </h3>
          <span className="text-xs text-muted-foreground">
            Tampilan pra-cetak resmi SIM Konveksi Sodai Group
          </span>
        </div>

        {/* Container that will be printed */}
        <div
          id="printable-report-container"
          className="bg-white text-gray-900 p-6 md:p-8 rounded-xl border border-gray-200 shadow-inner font-sans text-xs space-y-6"
        >
          {/* Document Header */}
          <div className="flex justify-between items-center border-b-2 border-[#003247] pb-4">
            <div>
              <h1 className="text-lg font-bold text-[#003247] tracking-tight">
                SODAI GROUP KONVEKSI
              </h1>
              <p className="text-[11px] text-gray-500">
                Sistem Informasi Manajemen Produksi & Persediaan Bahan Baku
              </p>
            </div>
            <div className="text-right text-[11px] text-gray-500">
              <p>
                Tanggal Cetak:{" "}
                <strong>
                  {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </p>
              <p>
                Nomor Dokumen:{" "}
                <span className="font-mono">
                  RPT-{Date.now().toString().slice(-6)}
                </span>
              </p>
            </div>
          </div>

          {/* Report Metadata */}
          <div>
            <h2 className="text-sm font-bold text-[#003247] uppercase mb-1">
              LAPORAN ANALISIS OPERASIONAL & PERSEDIAAN
            </h2>
            <p className="text-gray-600 text-[11px]">{getFilterSummaryText()}</p>
          </div>

          {/* Section 1: Work Order Summary & Table */}
          {(reportType === "semua" || reportType === "workorder") && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                I. LAPORAN WORK ORDER PRODUKSI ({workOrders.length} ITEMS)
              </h3>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Total Work Order</p>
                  <p className="text-sm font-bold text-gray-800">{woSummary.totalWO}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Target Output</p>
                  <p className="text-sm font-bold text-blue-600">
                    {woSummary.totalTarget.toLocaleString("id-ID")} pcs
                  </p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Realisasi Selesai</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {woSummary.totalSelesai.toLocaleString("id-ID")} pcs
                  </p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Defect Rate</p>
                  <p className="text-sm font-bold text-red-600">{woSummary.persentaseDefect}%</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                <thead>
                  <tr className="bg-[#003247] text-white">
                    <th className="p-2 border border-gray-300">No. WO</th>
                    <th className="p-2 border border-gray-300">Produk</th>
                    <th className="p-2 border border-gray-300">Unit Produksi</th>
                    <th className="p-2 border border-gray-300 text-right">Target</th>
                    <th className="p-2 border border-gray-300 text-right">Selesai</th>
                    <th className="p-2 border border-gray-300 text-right">Cacat</th>
                    <th className="p-2 border border-gray-300 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => {
                    const prod = products.find((p) => p.id === wo.productId);
                    const unit = units.find((u) => u.id === wo.unitId);
                    return (
                      <tr key={wo.id} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-mono font-medium">
                          {wo.nomor}
                        </td>
                        <td className="p-2 border border-gray-200">{prod ? prod.nama : "-"}</td>
                        <td className="p-2 border border-gray-200">{unit ? unit.nama : "-"}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">
                          {wo.jumlahTarget}
                        </td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-semibold text-emerald-600">
                          {wo.jumlahSelesai}
                        </td>
                        <td className="p-2 border border-gray-200 text-right font-mono text-red-500">
                          {wo.jumlahCacat}
                        </td>
                        <td className="p-2 border border-gray-200 text-center capitalize">
                          <span
                            className={`badge badge-${wo.status}`}
                          >
                            {wo.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="p-2 border border-gray-300">TOTAL / REKAPITULASI</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{woSummary.totalTarget}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono text-emerald-700">{woSummary.totalSelesai}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono text-red-600">{woSummary.totalCacat}</td>
                    <td className="p-2 border border-gray-300 text-center font-mono">Defect {woSummary.persentaseDefect}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Section 2: Production Stage & Unit Performance */}
          {(reportType === "semua" || reportType === "produksi") && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                II. LAPORAN TAHAP PRODUKSI & PERFORMA UNIT
              </h3>

              {/* Tahap Summary Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  1. Ringkasan Throughput Per Tahap Produksi
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">Tahap Produksi</th>
                      <th className="p-2 border border-gray-300 text-center">Jumlah WO</th>
                      <th className="p-2 border border-gray-300 text-right">Target Input</th>
                      <th className="p-2 border border-gray-300 text-right">Hasil Selesai</th>
                      <th className="p-2 border border-gray-300 text-right">Cacat (pcs)</th>
                      <th className="p-2 border border-gray-300 text-center">Defect Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageReports.map((stg) => (
                      <tr key={stg.tahap} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-semibold">{stg.tahap}</td>
                        <td className="p-2 border border-gray-200 text-center font-mono">{stg.jumlahWO} WO</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">{stg.totalMasuk.toLocaleString("id-ID")}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono text-emerald-600 font-semibold">{stg.totalSelesai.toLocaleString("id-ID")}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono text-red-500">{stg.totalCacat}</td>
                        <td className="p-2 border border-gray-200 text-center font-mono">{stg.defectRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Unit Performance Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  2. Performa Efisiensi Unit Produksi ({units.length} Unit)
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">Kode Unit</th>
                      <th className="p-2 border border-gray-300">Nama Unit Mesin</th>
                      <th className="p-2 border border-gray-300">Kategori</th>
                      <th className="p-2 border border-gray-300 text-center">Status</th>
                      <th className="p-2 border border-gray-300 text-center">Efisiensi Score</th>
                      <th className="p-2 border border-gray-300 text-right">WO Ditangani</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => {
                      const totalWOUnit = workOrders.filter((w) => w.unitId === u.id).length;
                      return (
                        <tr key={u.id} className="odd:bg-gray-50">
                          <td className="p-2 border border-gray-200 font-mono font-medium">{u.kode}</td>
                          <td className="p-2 border border-gray-200 font-medium">{u.nama}</td>
                          <td className="p-2 border border-gray-200 capitalize">{u.kategori || "-"}</td>
                          <td className="p-2 border border-gray-200 text-center capitalize">{u.status}</td>
                          <td className="p-2 border border-gray-200 text-center font-mono font-bold text-emerald-700">{u.efisiensi || 0}%</td>
                          <td className="p-2 border border-gray-200 text-right font-mono">{totalWOUnit} WO</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Inventory Summary & Tables */}
          {(reportType === "semua" || reportType === "persediaan") && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                III. LAPORAN PERSEDIAAN BAHAN BAKU & PRODUK JADI
              </h3>

              {/* Material Inventory Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  1. Stok Persediaan Bahan Baku ({materials.length} Items)
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">Kode</th>
                      <th className="p-2 border border-gray-300">Nama Bahan</th>
                      <th className="p-2 border border-gray-300 text-right">Stok Aktual</th>
                      <th className="p-2 border border-gray-300 text-right">Stok Min</th>
                      <th className="p-2 border border-gray-300 text-right">Harga Satuan</th>
                      <th className="p-2 border border-gray-300 text-right">Nilai Total (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-mono">{m.kode}</td>
                        <td className="p-2 border border-gray-200 font-medium">{m.nama}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold">{m.stokAktual} {m.satuan}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">{m.stokMin} {m.satuan}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">Rp {m.harga.toLocaleString("id-ID")}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono text-emerald-600 font-semibold">Rp {(m.stokAktual * m.harga).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={5} className="p-2 border border-gray-300">TOTAL VALUASI PERSEDIAAN BAHAN BAKU</td>
                      <td className="p-2 border border-gray-300 text-right font-mono text-emerald-700">Rp {inventoryValuation.totalNilaiMaterial.toLocaleString("id-ID")}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Finished Product Variants Inventory Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  2. Stok Produk Jadi Per Varian ({finishedProductVariants.length} Varian)
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">Nama Produk</th>
                      <th className="p-2 border border-gray-300">Warna</th>
                      <th className="p-2 border border-gray-300">Ukuran</th>
                      <th className="p-2 border border-gray-300 text-right">Gudang Besar</th>
                      <th className="p-2 border border-gray-300 text-right">Gudang Packing</th>
                      <th className="p-2 border border-gray-300 text-right">Stok Min</th>
                      <th className="p-2 border border-gray-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedProductVariants.map((v, idx) => (
                      <tr key={idx} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-medium">{v.productName}</td>
                        <td className="p-2 border border-gray-200">{v.warna}</td>
                        <td className="p-2 border border-gray-200 font-mono">{v.ukuran}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold text-blue-700">{v.stokGudangBesar} pcs</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold text-teal-700">{v.stokGudangPacking} pcs</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">{v.stokMin} pcs</td>
                        <td className="p-2 border border-gray-200 text-center">
                          <span
                            className={`badge ${
                              v.stokGudangPacking <= 0
                                ? "badge-batal"
                                : v.stokGudangPacking < v.stokMin
                                ? "badge-tertunda"
                                : "badge-selesai"
                            }`}
                          >
                            {v.stokGudangPacking <= 0
                              ? "Kosong"
                              : v.stokGudangPacking < v.stokMin
                              ? "Kritis"
                              : "Aman"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="p-2 border border-gray-300">TOTAL VOLUMES PRODUK JADI</td>
                      <td className="p-2 border border-gray-300 text-right font-mono text-blue-800">{inventoryValuation.totalStokGudangBesar} pcs</td>
                      <td className="p-2 border border-gray-300 text-right font-mono text-teal-800">{inventoryValuation.totalStokGudangPacking} pcs</td>
                      <td colSpan={2} className="p-2 border border-gray-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Warehouse Mutation Summary & Tables */}
          {(reportType === "semua" || reportType === "mutasi") && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                IV. LAPORAN MUTASI GUDANG & PENGELUARAN
              </h3>

              {/* Warehouse Transfers Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  1. Mutasi Transfer Gudang (Utama -&gt; Packing) ({transfers.length} Rekaman)
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">No. Transfer</th>
                      <th className="p-2 border border-gray-300">Produk</th>
                      <th className="p-2 border border-gray-300">Varian</th>
                      <th className="p-2 border border-gray-300 text-right">Jumlah</th>
                      <th className="p-2 border border-gray-300">Tanggal</th>
                      <th className="p-2 border border-gray-300">Petugas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((tr) => (
                      <tr key={tr.id} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-mono font-medium">{tr.nomorTransfer}</td>
                        <td className="p-2 border border-gray-200">{tr.productName}</td>
                        <td className="p-2 border border-gray-200">{tr.warna} ({tr.ukuran})</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold text-purple-700">{tr.jumlah} pcs</td>
                        <td className="p-2 border border-gray-200">{tr.tanggalTransfer || "-"}</td>
                        <td className="p-2 border border-gray-200">{tr.dibuatOleh}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="p-2 border border-gray-300">TOTAL TRANSFER GUDANG PACKING</td>
                      <td className="p-2 border border-gray-300 text-right font-mono text-purple-800">{mutationSummary.totalJumlahTransfer} pcs</td>
                      <td colSpan={2} className="p-2 border border-gray-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Product Outflows Table */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">
                  2. Mutasi Pengeluaran Produk Jadi ({outflows.length} Rekaman)
                </p>
                <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-[#003247] text-white">
                      <th className="p-2 border border-gray-300">No. Outflow</th>
                      <th className="p-2 border border-gray-300">Produk</th>
                      <th className="p-2 border border-gray-300">Varian</th>
                      <th className="p-2 border border-gray-300 text-right">Jumlah</th>
                      <th className="p-2 border border-gray-300">Pelanggan</th>
                      <th className="p-2 border border-gray-300">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outflows.map((out) => (
                      <tr key={out.id} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-mono font-medium">{out.nomorOutflow}</td>
                        <td className="p-2 border border-gray-200">{out.productName}</td>
                        <td className="p-2 border border-gray-200">{out.warna} ({out.ukuran})</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-bold text-emerald-700">{out.jumlah} pcs</td>
                        <td className="p-2 border border-gray-200">{out.pelanggan || "-"}</td>
                        <td className="p-2 border border-gray-200">{out.tanggalOutflow || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="p-2 border border-gray-300">TOTAL PENGELUARAN PRODUK JADI</td>
                      <td className="p-2 border border-gray-300 text-right font-mono text-emerald-800">{mutationSummary.totalJumlahPengeluaran} pcs</td>
                      <td colSpan={2} className="p-2 border border-gray-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Signatures Authorization Box */}
          <div className="flex justify-between pt-10 text-center text-[11px]">
            <div className="w-48">
              <p className="text-gray-500">Dibuat Oleh,</p>
              <div className="h-16 border-b border-gray-400"></div>
              <p className="mt-1 font-semibold text-gray-800">Staf Admin Operasional</p>
            </div>
            <div className="w-48">
              <p className="text-gray-500">Disetujui Oleh,</p>
              <div className="h-16 border-b border-gray-400"></div>
              <p className="mt-1 font-semibold text-gray-800">Manajer Operasional / Kepala Tim</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
