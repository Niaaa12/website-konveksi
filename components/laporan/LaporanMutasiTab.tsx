"use client";

import React, { useState } from "react";
import { StockTransaction, WarehouseTransfer, ProductOutflow, Material } from "@/lib/firestore";
import { WarehouseMutationReport } from "./types";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkOrder, AppUser } from "@/lib/firestore";
import {
  ArrowLeftRight,
  Truck,
  Package,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LaporanMutasiTabProps {
  transactions: StockTransaction[];
  transfers: WarehouseTransfer[];
  outflows: ProductOutflow[];
  materials: Material[];
  summary: WarehouseMutationReport;
  workOrders: WorkOrder[]; 
  operators: AppUser[];
}

export function LaporanMutasiTab({
  transactions,
  transfers,
  outflows,
  materials,
  summary,
  workOrders, 
  operators,
}: LaporanMutasiTabProps) {
  const [subTab, setSubTab] = useState<
    "transaksi" | "transfer" | "pengeluaran"
  >("transaksi");
  const [searchFilter, setSearchFilter] = useState("");

  const filteredTransactions = transactions.filter((t) => {
    const mat = materials.find((m) => m.id === t.materialId);
    const text = `${mat ? mat.nama : ""} ${t.refTipe} ${t.refId} ${t.catatan} ${
      t.dilakukanOleh
    }`.toLowerCase();
    return text.includes(searchFilter.toLowerCase());
  });

  const filteredTransfers = transfers.filter((tr) => {
    const text =
      `${tr.nomorTransfer} ${tr.productName} ${tr.warna} ${tr.ukuran} ${tr.dibuatOleh}`.toLowerCase();
    return text.includes(searchFilter.toLowerCase());
  });

  const filteredOutflows = outflows.filter((out) => {
    const text = `${out.nomorOutflow} ${out.productName} ${out.warna} ${
      out.ukuran
    } ${out.pelanggan || ""} ${out.dibuatOleh}`.toLowerCase();
    return text.includes(searchFilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Transaksi Stok Bahan"
          value={String(summary.totalTransaksiMaterial)}
          subtitle={`${summary.materialMasuk} Masuk | ${summary.materialKeluar} Keluar`}
          icon={Boxes}
          iconBg="bg-blue-100 text-blue-700"
          trend="neutral"
          trendValue="Bahan Baku"
        />
        <StatCard
          title="Total Transfer Gudang"
          value={String(summary.totalTransferGudang)}
          subtitle={`Total: ${summary.totalJumlahTransfer.toLocaleString(
            "id-ID"
          )} pcs`}
          icon={Truck}
          iconBg="bg-purple-100 text-purple-700"
          trend="up"
          trendValue="Gudang Besar -> Packing"
        />
        <StatCard
          title="Total Pengeluaran Produk"
          value={String(summary.totalPengeluaranProduk)}
          subtitle={`Total: ${summary.totalJumlahPengeluaran.toLocaleString(
            "id-ID"
          )} pcs`}
          icon={Package}
          iconBg="bg-emerald-100 text-emerald-700"
          trend="up"
          trendValue="Gudang Packing -> Keluar"
        />
        <StatCard
          title="Total Volume Mutasi"
          value={`${(
            summary.totalJumlahTransfer + summary.totalJumlahPengeluaran
          ).toLocaleString("id-ID")} pcs`}
          subtitle="Aktivitas fisik persediaan"
          icon={ArrowLeftRight}
          iconBg="bg-[#003247]/10 text-[#003247]"
          trend="neutral"
          trendValue="Volume"
        />
      </div>

      {/* Toggle Sub-tab & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSubTab("transaksi")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all flex-shrink-0 ${
              subTab === "transaksi"
                ? "bg-[#003247] text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Boxes className="h-4 w-4" /> Transaksi Bahan Baku (
            {transactions.length})
          </button>
          <button
            onClick={() => setSubTab("transfer")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all flex-shrink-0 ${
              subTab === "transfer"
                ? "bg-[#003247] text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="h-4 w-4" /> Transfer Gudang ({transfers.length})
          </button>
          <button
            onClick={() => setSubTab("pengeluaran")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all flex-shrink-0 ${
              subTab === "pengeluaran"
                ? "bg-[#003247] text-white shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" /> Pengeluaran Produk (
            {outflows.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari log mutasi..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
        </div>
      </div>

      {/* Sub-tab 1: Transaksi Bahan Baku */}
      {subTab === "transaksi" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Log Transaksi Persediaan Bahan Baku ({filteredTransactions.length}
              )
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">Bahan Baku</th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Jenis Transaksi
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">Jumlah</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Stok Sebelum
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Stok Sesudah
                  </th>
                  <th className="py-3 px-4 font-semibold">Referensi</th>
                  <th className="py-3 px-4 font-semibold">Dilakukan Oleh</th>
                  <th className="py-3 px-4 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTransactions.map((tx) => {
                  const mat = materials.find((m) => m.id === tx.materialId);
                  const isMasuk = tx.jenis === "masuk";
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {mat ? mat.nama : "Bahan Baku"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                            isMasuk
                              ? "bg-emerald-100 text-emerald-700"
                              : tx.jenis === "keluar"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {isMasuk ? (
                            <ArrowDownRight className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {tx.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isMasuk ? "+" : "-"}
                        {tx.jumlah} {mat?.satuan || "pcs"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {tx.stokSebelum}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                        {tx.stokSesudah}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {(() => {
                          if (tx.refTipe === "WO") {
                            const matchedWO = workOrders.find(
                              (w) => w.id === tx.refId
                            );
                            return matchedWO
                              ? `WO: ${matchedWO.nomor}`
                              : `WO (${
                                  tx.refId ? tx.refId.slice(0, 6) : "-"
                                }...)`;
                          }
                          return `${tx.refTipe} (${
                            tx.refId ? tx.refId.slice(0, 6) : "-"
                          }...)`;
                        })()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {(() => {
                          const matchedUser = operators.find(
                            (op) =>
                              op.id === tx.dilakukanOleh ||
                              op.email === tx.dilakukanOleh
                          );
                          return matchedUser
                            ? matchedUser.nama
                            : tx.dilakukanOleh === "Sistem"
                            ? "Sistem Otomatis"
                            : tx.dilakukanOleh || "-";
                        })()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                        {tx.catatan || "-"}
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground text-xs"
                    >
                      Tidak ada transaksi stok bahan baku sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Transfer Gudang */}
      {subTab === "transfer" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Log Transfer Gudang (Gudang Besar → Gudang Packing) (
              {filteredTransfers.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Transfer</th>
                  <th className="py-3 px-4 font-semibold">Produk</th>
                  <th className="py-3 px-4 font-semibold">Varian Warna</th>
                  <th className="py-3 px-4 font-semibold">Ukuran</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Jumlah Transfer
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Tanggal
                  </th>
                  <th className="py-3 px-4 font-semibold">Dibuat Oleh</th>
                  <th className="py-3 px-4 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTransfers.map((tr) => (
                  <tr
                    key={tr.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {tr.nomorTransfer}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {tr.productName}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {tr.warna}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {tr.ukuran}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-600">
                      {tr.jumlah.toLocaleString("id-ID")} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {tr.tanggalTransfer || "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {tr.dibuatOleh || "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                      {tr.catatan || "-"}
                    </td>
                  </tr>
                ))}
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground text-xs"
                    >
                      Tidak ada data transfer gudang sesuai filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Pengeluaran Produk */}
      {subTab === "pengeluaran" && (
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Log Pengeluaran / Pengiriman Produk Jadi (
              {filteredOutflows.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Pengeluaran</th>
                  <th className="py-3 px-4 font-semibold">Produk</th>
                  <th className="py-3 px-4 font-semibold">Varian Warna</th>
                  <th className="py-3 px-4 font-semibold">Ukuran</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Jumlah Keluar
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    Pelanggan / Tujuan
                  </th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Tanggal
                  </th>
                  <th className="py-3 px-4 font-semibold">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOutflows.map((out) => (
                  <tr
                    key={out.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {out.nomorOutflow}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {out.productName}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {out.warna}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {out.ukuran}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      {out.jumlah.toLocaleString("id-ID")} pcs
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {out.pelanggan || "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {out.tanggalOutflow || "-"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {out.dibuatOleh || "-"}
                    </td>
                  </tr>
                ))}
                {filteredOutflows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground text-xs"
                    >
                      Tidak ada data pengeluaran produk sesuai filter.
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
