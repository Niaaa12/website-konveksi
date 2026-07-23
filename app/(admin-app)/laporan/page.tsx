"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  getWorkOrders,
  getMaterials,
  getProducts,
  getProductionUnitsWithEfisiensi,
  getOperators,
  getWarehouseTransfers,
  getProductOutflows,
  getVariantsByProductIds,
  getTahapProduksiSummary,
  WorkOrder,
  Material,
  Product,
  ProductionUnit,
  AppUser,
  WarehouseTransfer,
  ProductOutflow,
  ProductVariant,
} from "@/lib/firestore";
import {
  LaporanTabId,
  LaporanFilterState,
  WOSummaryReport,
  InventoryValuationReport,
  WarehouseMutationReport,
  ProductionStageReport,
  FilterOptions,
} from "@/components/laporan/types";
import { LaporanFilterBar } from "@/components/laporan/LaporanFilterBar";
import { LaporanRingkasanTab } from "@/components/laporan/LaporanRingkasanTab";
import { LaporanWorkOrderTab } from "@/components/laporan/LaporanWorkOrderTab";
import { LaporanProduksiTab } from "@/components/laporan/LaporanProduksiTab";
import { LaporanPersediaanTab } from "@/components/laporan/LaporanPersediaanTab";
import { LaporanMutasiTab } from "@/components/laporan/LaporanMutasiTab";
import { LaporanExportTab } from "@/components/laporan/LaporanExportTab";
import {
  BarChart3,
  ClipboardList,
  Factory,
  Package,
  ArrowLeftRight,
  Download,
  Loader2,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function LaporanPage() {
  const { user, isAdmin, isManajer, isProduksi, isGudang, isPICProduksi, loading: authLoading } =
    useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState<LaporanTabId>("ringkasan");

  // Global Filter State
  const [filterState, setFilterState] = useState<LaporanFilterState>({
    presetTanggal: "semua",
    tanggalAwal: "",
    tanggalAkhir: "",
    productId: "semua",
    status: "semua",
    operatorId: "semua",
    unitId: "semua",
    searchQuery: "",
  });

  // Raw Data States
  const [loadingData, setLoadingData] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<ProductionUnit[]>([]);
  const [operators, setOperators] = useState<AppUser[]>([]);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);
  const [outflows, setOutflows] = useState<ProductOutflow[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({});
  const [tahapSummaries, setTahapSummaries] = useState<any[]>([]);

  // Load Firestore Data
  useEffect(() => {
    async function loadAllData() {
      setLoadingData(true);
      try {
        const [wosData, matsData, prodsData, unitsData, opsData, trfData, outData, stageSumData] =
          await Promise.all([
            getWorkOrders().catch(() => []),
            getMaterials().catch(() => []),
            getProducts().catch(() => []),
            getProductionUnitsWithEfisiensi().catch(() => []),
            getOperators().catch(() => []),
            getWarehouseTransfers().catch(() => []),
            getProductOutflows().catch(() => []),
            getTahapProduksiSummary().catch(() => []),
          ]);

        setWorkOrders(wosData);
        setMaterials(matsData);
        setProducts(prodsData);
        setUnits(unitsData);
        setOperators(opsData);
        setTransfers(trfData);
        setOutflows(outData);
        setTahapSummaries(stageSumData);

        // Fetch variants for all products
        if (prodsData.length > 0) {
          const pIds = prodsData.map((p) => p.id!).filter(Boolean);
          const vars = await getVariantsByProductIds(pIds);
          setVariantsMap(vars);
        }
      } catch (err) {
        console.error("Gagal memuat data Laporan:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (!authLoading && !isPICProduksi) {
      loadAllData();
    }
  }, [authLoading, isPICProduksi]);

  // Determine Visible Tabs based on User Role (RBAC)
  const visibleTabs = useMemo(() => {
    if (isAdmin || isManajer) {
      return [
        { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
        { id: "workorder", label: "Work Order", icon: ClipboardList },
        { id: "produksi", label: "Produksi", icon: Factory },
        { id: "persediaan", label: "Persediaan", icon: Package },
        { id: "mutasi", label: "Mutasi Gudang", icon: ArrowLeftRight },
        { id: "export", label: "Export", icon: Download },
      ];
    }
    if (isProduksi) {
      // Kepala Tim Produksi
      return [
        { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
        { id: "workorder", label: "Work Order", icon: ClipboardList },
        { id: "produksi", label: "Produksi", icon: Factory },
      ];
    }
    if (isGudang) {
      // Kepala Gudang
      return [
        { id: "ringkasan", label: "Ringkasan", icon: BarChart3 },
        { id: "persediaan", label: "Persediaan", icon: Package },
        { id: "mutasi", label: "Mutasi Gudang", icon: ArrowLeftRight },
      ];
    }
    return [];
  }, [isAdmin, isManajer, isProduksi, isGudang]);

  // Ensure active tab is within allowed tabs
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id as LaporanTabId);
    }
  }, [visibleTabs, activeTab]);

  // Global Filtering Logic across Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      // Date Range Filter
      if (filterState.tanggalAwal) {
        const woDate = wo.tanggalMulai || (wo.createdAt ? new Date(wo.createdAt).toISOString().slice(0, 10) : "");
        if (woDate && woDate < filterState.tanggalAwal) return false;
      }
      if (filterState.tanggalAkhir) {
        const woDate = wo.tanggalMulai || (wo.createdAt ? new Date(wo.createdAt).toISOString().slice(0, 10) : "");
        if (woDate && woDate > filterState.tanggalAkhir) return false;
      }

      // Product Filter
      if (filterState.productId !== "semua" && wo.productId !== filterState.productId) {
        return false;
      }

      // Status Filter
      if (filterState.status !== "semua" && wo.status !== filterState.status) {
        return false;
      }

      // Operator / PIC Filter
      if (filterState.operatorId !== "semua" && wo.operatorId !== filterState.operatorId) {
        return false;
      }

      // Unit Filter
      if (filterState.unitId !== "semua" && wo.unitId !== filterState.unitId) {
        return false;
      }

      // Search Query Filter
      if (filterState.searchQuery.trim() !== "") {
        const q = filterState.searchQuery.toLowerCase();
        const prod = products.find((p) => p.id === wo.productId);
        const matchNomor = wo.nomor.toLowerCase().includes(q);
        const matchProd = prod ? prod.nama.toLowerCase().includes(q) : false;
        if (!matchNomor && !matchProd) return false;
      }

      return true;
    });
  }, [workOrders, filterState, products]);

  // Global Filtering Logic across Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (filterState.searchQuery.trim() !== "") {
        const q = filterState.searchQuery.toLowerCase();
        return m.nama.toLowerCase().includes(q) || m.kode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [materials, filterState]);

  // Global Filtering Logic across Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((tr) => {
      if (filterState.tanggalAwal && tr.tanggalTransfer < filterState.tanggalAwal) return false;
      if (filterState.tanggalAkhir && tr.tanggalTransfer > filterState.tanggalAkhir) return false;
      if (filterState.productId !== "semua" && tr.productId !== filterState.productId) return false;
      if (filterState.searchQuery.trim() !== "") {
        const q = filterState.searchQuery.toLowerCase();
        return (
          tr.nomorTransfer.toLowerCase().includes(q) ||
          tr.productName.toLowerCase().includes(q) ||
          tr.warna.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transfers, filterState]);

  // Global Filtering Logic across Outflows
  const filteredOutflows = useMemo(() => {
    return outflows.filter((out) => {
      if (filterState.tanggalAwal && out.tanggalOutflow < filterState.tanggalAwal) return false;
      if (filterState.tanggalAkhir && out.tanggalOutflow > filterState.tanggalAkhir) return false;
      if (filterState.productId !== "semua" && out.productId !== filterState.productId) return false;
      if (filterState.searchQuery.trim() !== "") {
        const q = filterState.searchQuery.toLowerCase();
        return (
          out.nomorOutflow.toLowerCase().includes(q) ||
          out.productName.toLowerCase().includes(q) ||
          (out.pelanggan || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [outflows, filterState]);

  // Aggregated Report Metrics
  const woSummaryReport: WOSummaryReport = useMemo(() => {
    const totalWO = filteredWorkOrders.length;
    const selesai = filteredWorkOrders.filter((w) => w.status === "selesai").length;
    const berjalan = filteredWorkOrders.filter((w) => w.status === "berjalan").length;
    const tertunda = filteredWorkOrders.filter((w) => w.status === "tertunda").length;
    const dijadwalkan = filteredWorkOrders.filter((w) => w.status === "dijadwalkan").length;
    const batal = filteredWorkOrders.filter((w) => w.status === "batal").length;

    const totalTarget = filteredWorkOrders.reduce((sum, w) => sum + (w.jumlahTarget || 0), 0);
    const totalSelesai = filteredWorkOrders.reduce((sum, w) => sum + (w.jumlahSelesai || 0), 0);
    const totalCacat = filteredWorkOrders.reduce((sum, w) => sum + (w.jumlahCacat || 0), 0);

    const persentasePencapaian =
      totalTarget > 0 ? Math.min(100, Math.round((totalSelesai / totalTarget) * 100)) : 0;
    const persentaseDefect =
      totalSelesai > 0 ? Number(((totalCacat / totalSelesai) * 100).toFixed(1)) : 0;

    return {
      totalWO,
      selesai,
      berjalan,
      tertunda,
      dijadwalkan,
      batal,
      totalTarget,
      totalSelesai,
      totalCacat,
      persentasePencapaian,
      persentaseDefect,
    };
  }, [filteredWorkOrders]);

  // Inventory Valuation Metrics
  const inventoryValuationReport: InventoryValuationReport = useMemo(() => {
    const totalNilaiMaterial = filteredMaterials.reduce(
      (sum, m) => sum + m.stokAktual * m.harga,
      0
    );
    const totalMaterialAktif = filteredMaterials.length;
    const totalMaterialKritis = filteredMaterials.filter((m) => m.stokAktual <= m.stokMin).length;

    let totalStokGudangBesar = 0;
    let totalStokGudangPacking = 0;
    let totalVarianKritisPacking = 0;

    Object.values(variantsMap).forEach((vList) => {
      vList.forEach((v) => {
        totalStokGudangBesar += v.stokJadi || 0;
        totalStokGudangPacking += v.stokGudangPacking || 0;
        if ((v.stokGudangPacking || 0) < (v.stokMin || 20)) {
          totalVarianKritisPacking++;
        }
      });
    });

    return {
      totalNilaiMaterial,
      totalMaterialAktif,
      totalMaterialKritis,
      totalNilaiProdukJadi: 0,
      totalStokGudangBesar,
      totalStokGudangPacking,
      totalVarianKritisPacking,
    };
  }, [filteredMaterials, variantsMap]);

  // Mutation Metrics
  const mutationReport: WarehouseMutationReport = useMemo(() => {
    return {
      totalTransaksiMaterial: filteredMaterials.length,
      materialMasuk: 0,
      materialKeluar: 0,
      totalTransferGudang: filteredTransfers.length,
      totalJumlahTransfer: filteredTransfers.reduce((sum, tr) => sum + tr.jumlah, 0),
      totalPengeluaranProduk: filteredOutflows.length,
      totalJumlahPengeluaran: filteredOutflows.reduce((sum, out) => sum + out.jumlah, 0),
    };
  }, [filteredMaterials, filteredTransfers, filteredOutflows]);

  // Stage Reports
  const stageReports: ProductionStageReport[] = useMemo(() => {
    return tahapSummaries.map((s) => {
      const defRate = s.totalSelesai > 0 ? Number(((s.totalCacat / s.totalSelesai) * 100).toFixed(1)) : 0;
      return {
        tahap: s.labelPendek || s.tahapId,
        jumlahWO: s.jumlahWO,
        totalMasuk: s.totalMasuk,
        totalSelesai: s.totalSelesai,
        totalCacat: s.totalCacat,
        defectRate: defRate,
        jumlahKendala: s.jumlahWOMasalah,
      };
    });
  }, [tahapSummaries]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilterState({
      presetTanggal: "semua",
      tanggalAwal: "",
      tanggalAkhir: "",
      productId: "semua",
      status: "semua",
      operatorId: "semua",
      unitId: "semua",
      searchQuery: "",
    });
  };

  // Blocked Access UI for PIC Produksi
  if (isPICProduksi) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center px-4">
        <div className="rounded-full bg-red-100 p-4 text-red-600 dark:bg-red-900/40 dark:text-red-400 mb-4">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          Role <strong>PIC Produksi</strong> tidak memiliki hak akses untuk membuka Pusat Analisis Laporan. Silakan kembali ke halaman pekerjaan Anda.
        </p>
        <Link
          href="/progress"
          className="mt-5 rounded-xl bg-[#003247] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#004a6e] transition-all shadow-xs"
        >
          Kembali ke Progress Saya
        </Link>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6 pb-12">
        {/* Global Filter Bar */}
        <LaporanFilterBar
          filterState={filterState}
          setFilterState={setFilterState}
          filterOptions={{
            products,
            units,
            operators,
          }}
          onReset={handleResetFilters}
        />

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as LaporanTabId)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-4 text-xs font-semibold transition-all",
                    isActive
                      ? "border-[#003247] text-[#003247] dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Loading Spinner */}
        {loadingData ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
              <p className="text-xs text-muted-foreground">Memuat data analisis laporan...</p>
            </div>
          </div>
        ) : (
          /* Active Tab Render */
          <div>
            {activeTab === "ringkasan" && (
              <LaporanRingkasanTab
                workOrders={filteredWorkOrders}
                materials={filteredMaterials}
                products={products}
                transfers={filteredTransfers}
                outflows={filteredOutflows}
                variantsMap={variantsMap}
                woSummary={woSummaryReport}
                inventoryValuation={inventoryValuationReport}
                mutationSummary={mutationReport}
              />
            )}

            {activeTab === "workorder" && (
              <LaporanWorkOrderTab
                workOrders={filteredWorkOrders}
                products={products}
                units={units}
                operators={operators}
                summary={woSummaryReport}
              />
            )}

            {activeTab === "produksi" && (
              <LaporanProduksiTab
                workOrders={filteredWorkOrders}
                units={units}
                operators={operators}
                stageReports={stageReports}
              />
            )}

            {activeTab === "persediaan" && (
              <LaporanPersediaanTab
                materials={filteredMaterials}
                products={products}
                variantsMap={variantsMap}
                valuation={inventoryValuationReport}
              />
            )}

            {activeTab === "mutasi" && (
              <LaporanMutasiTab
                transactions={[]}
                transfers={filteredTransfers}
                outflows={filteredOutflows}
                materials={filteredMaterials}
                summary={mutationReport}
              />
            )}

            {activeTab === "export" && (
              <LaporanExportTab
                filterState={filterState}
                workOrders={filteredWorkOrders}
                materials={filteredMaterials}
                products={products}
                units={units}
                operators={operators}
                transfers={filteredTransfers}
                outflows={filteredOutflows}
                variantsMap={variantsMap}
                woSummary={woSummaryReport}
                inventoryValuation={inventoryValuationReport}
                mutationSummary={mutationReport}
                stageReports={stageReports}
              />
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
