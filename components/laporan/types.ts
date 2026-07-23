import {
  WorkOrder,
  Material,
  Product,
  ProductVariant,
  ProductionUnit,
  StockTransaction,
  WarehouseTransfer,
  ProductOutflow,
  AppUser,
  TahapProduksi,
  WoStatus,
} from "@/lib/firestore";

export type LaporanTabId =
  | "ringkasan"
  | "workorder"
  | "produksi"
  | "persediaan"
  | "mutasi"
  | "export";

export type DatePreset = "semua" | "7hari" | "30hari" | "bulanIni" | "custom";

export interface LaporanFilterState {
  presetTanggal: DatePreset;
  tanggalAwal: string;
  tanggalAkhir: string;
  productId: string;
  status: string;
  operatorId: string;
  unitId: string;
  searchQuery: string;
}

export interface WOSummaryReport {
  totalWO: number;
  selesai: number;
  berjalan: number;
  tertunda: number;
  dijadwalkan: number;
  batal: number;
  totalTarget: number;
  totalSelesai: number;
  totalCacat: number;
  persentasePencapaian: number;
  persentaseDefect: number;
}

export interface ProductionStageReport {
  tahap: string;
  jumlahWO: number;
  totalMasuk: number;
  totalSelesai: number;
  totalCacat: number;
  defectRate: number;
  jumlahKendala: number;
}

export interface UnitEfficiencyReport {
  unitId: string;
  namaUnit: string;
  kategori: string;
  status: string;
  efisiensi: number;
  totalWO: number;
  totalTarget: number;
  totalSelesai: number;
}

export interface InventoryValuationReport {
  totalNilaiMaterial: number;
  totalMaterialAktif: number;
  totalMaterialKritis: number;
  totalNilaiProdukJadi: number;
  totalStokGudangBesar: number;
  totalStokGudangPacking: number;
  totalVarianKritisPacking: number;
}

export interface WarehouseMutationReport {
  totalTransaksiMaterial: number;
  materialMasuk: number;
  materialKeluar: number;
  totalTransferGudang: number;
  totalJumlahTransfer: number;
  totalPengeluaranProduk: number;
  totalJumlahPengeluaran: number;
}

export interface FilterOptions {
  products: Product[];
  units: ProductionUnit[];
  operators: AppUser[];
}
