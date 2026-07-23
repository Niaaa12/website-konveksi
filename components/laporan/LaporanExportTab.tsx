"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Tag,
  Users,
  Factory,
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
}: LaporanExportTabProps) {
  const [reportType, setReportType] = useState<
    "semua" | "workorder" | "produksi" | "persediaan" | "mutasi"
  >("semua");

  // Handler: Export Excel CSV
  const handleExportExcel = () => {
    const today = new Date().toISOString().slice(0, 10);

    if (reportType === "workorder" || reportType === "semua") {
      const headers = [
        "Nomor WO",
        "Produk",
        "Unit Produksi",
        "PIC / Operator",
        "Jumlah Target",
        "Jumlah Selesai",
        "Jumlah Cacat",
        "Status",
        "Tanggal Mulai",
        "Tanggal Target",
      ];
      const rows = workOrders.map((wo) => {
        const prod = products.find((p) => p.id === wo.productId);
        const unit = units.find((u) => u.id === wo.unitId);
        const pic = operators.find((op) => op.id === wo.operatorId);
        return [
          wo.nomor,
          prod ? prod.nama : "",
          unit ? unit.nama : "",
          pic ? pic.nama : "",
          String(wo.jumlahTarget),
          String(wo.jumlahSelesai),
          String(wo.jumlahCacat),
          wo.status,
          wo.tanggalMulai || "",
          wo.tanggalTarget || "",
        ];
      });
      downloadCSV(`Laporan_WorkOrder_${today}.csv`, [headers, ...rows]);
    }

    if (reportType === "persediaan") {
      const headers = [
        "Kode Material",
        "Nama Bahan Baku",
        "Satuan",
        "Stok Aktual",
        "Stok Minimum",
        "Harga Satuan (Rp)",
        "Nilai Total (Rp)",
        "Status Stok",
      ];
      const rows = materials.map((m) => [
        m.kode,
        m.nama,
        m.satuan,
        String(m.stokAktual),
        String(m.stokMin),
        String(m.harga),
        String(m.stokAktual * m.harga),
        m.stokAktual <= 0 ? "Habis" : m.stokAktual <= m.stokMin ? "Kritis" : "Aman",
      ]);
      downloadCSV(`Laporan_Persediaan_BahanBaku_${today}.csv`, [headers, ...rows]);
    }

    if (reportType === "mutasi") {
      const headers = [
        "No. Transfer",
        "Nama Produk",
        "Varian Warna",
        "Ukuran",
        "Jumlah",
        "Tanggal Transfer",
        "Dibuat Oleh",
      ];
      const rows = transfers.map((tr) => [
        tr.nomorTransfer,
        tr.productName,
        tr.warna,
        tr.ukuran,
        String(tr.jumlah),
        tr.tanggalTransfer || "",
        tr.dibuatOleh,
      ]);
      downloadCSV(`Laporan_Mutasi_TransferGudang_${today}.csv`, [headers, ...rows]);
    }
  };

  // Handler: Print / PDF
  const handlePrint = () => {
    printDocument("printable-report-container");
  };

  const getFilterSummaryText = () => {
    const parts = [];
    if (filterState.presetTanggal !== "semua") {
      parts.push(`Periode: ${filterState.tanggalAwal || "Awal"} s/d ${filterState.tanggalAkhir || "Sekarang"}`);
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
            Pilih jenis data laporan yang ingin Anda cetak atau unduh dalam format Excel (.csv) / Dokumen PDF.
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
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" /> Unduh Excel (.csv)
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#003247] hover:bg-[#004a6e] text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition-all"
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
              <p>Tanggal Cetak: <strong>{new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
              <p>Nomor Dokumen: <span className="font-mono">RPT-{Date.now().toString().slice(-6)}</span></p>
            </div>
          </div>

          {/* Report Metadata */}
          <div>
            <h2 className="text-sm font-bold text-[#003247] uppercase mb-1">
              LAPORAN ANALISIS OPERASIONAL & PERSEDIAAN
            </h2>
            <p className="text-gray-600 text-[11px]">
              {getFilterSummaryText()}
            </p>
          </div>

          {/* Section 1: Executive KPI Summary */}
          {(reportType === "semua" || reportType === "workorder") && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                I. RINGKASAN KINERJA WORK ORDER
              </h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Total Work Order</p>
                  <p className="text-sm font-bold text-gray-800">{woSummary.totalWO}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Target Output</p>
                  <p className="text-sm font-bold text-blue-600">{woSummary.totalTarget.toLocaleString("id-ID")} pcs</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Realisasi Selesai</p>
                  <p className="text-sm font-bold text-emerald-600">{woSummary.totalSelesai.toLocaleString("id-ID")} pcs</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  <p className="text-[10px] text-gray-500">Defect Rate</p>
                  <p className="text-sm font-bold text-red-600">{woSummary.persentaseDefect}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Work Order Table Preview */}
          {(reportType === "semua" || reportType === "workorder") && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#003247]">
                DAFTAR WORK ORDER ({workOrders.length} ITEMS)
              </h3>
              <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                <thead>
                  <tr className="bg-[#003247] text-white">
                    <th className="p-2 border border-gray-300">No. WO</th>
                    <th className="p-2 border border-gray-300">Produk</th>
                    <th className="p-2 border border-gray-300 text-right">Target</th>
                    <th className="p-2 border border-gray-300 text-right">Selesai</th>
                    <th className="p-2 border border-gray-300 text-right">Cacat</th>
                    <th className="p-2 border border-gray-300 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.slice(0, 10).map((wo) => {
                    const prod = products.find((p) => p.id === wo.productId);
                    return (
                      <tr key={wo.id} className="odd:bg-gray-50">
                        <td className="p-2 border border-gray-200 font-mono font-medium">{wo.nomor}</td>
                        <td className="p-2 border border-gray-200">{prod ? prod.nama : "-"}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono">{wo.jumlahTarget}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono font-semibold text-emerald-600">{wo.jumlahSelesai}</td>
                        <td className="p-2 border border-gray-200 text-right font-mono text-red-500">{wo.jumlahCacat}</td>
                        <td className="p-2 border border-gray-200 text-center capitalize">{wo.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {workOrders.length > 10 && (
                <p className="text-[10px] text-gray-500 italic text-right">
                  * Menampilkan 10 dari {workOrders.length} Work Order pada pratinjau. Unduh Excel untuk daftar lengkap.
                </p>
              )}
            </div>
          )}

          {/* Section 3: Inventory Summary Preview */}
          {(reportType === "semua" || reportType === "persediaan") && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#003247] border-b border-gray-200 pb-1">
                II. STATUS PERSEDIAAN BAHAN BAKU
              </h3>
              <table className="w-full text-left border-collapse border border-gray-200 text-[11px]">
                <thead>
                  <tr className="bg-[#003247] text-white">
                    <th className="p-2 border border-gray-300">Kode</th>
                    <th className="p-2 border border-gray-300">Nama Bahan</th>
                    <th className="p-2 border border-gray-300 text-right">Stok Aktual</th>
                    <th className="p-2 border border-gray-300 text-right">Stok Min</th>
                    <th className="p-2 border border-gray-300 text-right">Nilai Total (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.slice(0, 8).map((m) => (
                    <tr key={m.id} className="odd:bg-gray-50">
                      <td className="p-2 border border-gray-200 font-mono">{m.kode}</td>
                      <td className="p-2 border border-gray-200">{m.nama}</td>
                      <td className="p-2 border border-gray-200 text-right font-mono font-bold">{m.stokAktual} {m.satuan}</td>
                      <td className="p-2 border border-gray-200 text-right font-mono">{m.stokMin} {m.satuan}</td>
                      <td className="p-2 border border-gray-200 text-right font-mono text-emerald-600">Rp {(m.stokAktual * m.harga).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
