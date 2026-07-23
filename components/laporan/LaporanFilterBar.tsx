"use client";

import React from "react";
import {
  Calendar,
  Filter,
  RotateCcw,
  Search,
  ChevronDown,
  Tag,
  Users,
  Factory,
  CheckCircle2,
} from "lucide-react";
import { LaporanFilterState, DatePreset, FilterOptions } from "./types";

interface LaporanFilterBarProps {
  filterState: LaporanFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<LaporanFilterState>>;
  filterOptions: FilterOptions;
  onReset: () => void;
}

export function LaporanFilterBar({
  filterState,
  setFilterState,
  filterOptions,
  onReset,
}: LaporanFilterBarProps) {
  const handlePresetChange = (preset: DatePreset) => {
    const today = new Date();
    let awal = "";
    let akhir = today.toISOString().slice(0, 10);

    if (preset === "7hari") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      awal = d.toISOString().slice(0, 10);
    } else if (preset === "30hari") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      awal = d.toISOString().slice(0, 10);
    } else if (preset === "bulanIni") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      awal = d.toISOString().slice(0, 10);
    } else if (preset === "semua") {
      awal = "";
      akhir = "";
    }

    setFilterState((prev) => ({
      ...prev,
      presetTanggal: preset,
      tanggalAwal: awal,
      tanggalAkhir: akhir,
    }));
  };

  const isFiltered =
    filterState.presetTanggal !== "semua" ||
    filterState.productId !== "semua" ||
    filterState.status !== "semua" ||
    filterState.operatorId !== "semua" ||
    filterState.unitId !== "semua" ||
    filterState.searchQuery.trim() !== "";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* Top Bar: Search + Filter Preset Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Keyword Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nomor WO, nama produk, varian, atau nama PIC..."
            value={filterState.searchQuery}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30 transition-all"
          />
          {filterState.searchQuery && (
            <button
              onClick={() =>
                setFilterState((prev) => ({ ...prev, searchQuery: "" }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Date Preset Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1 font-medium flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" /> Periode:
          </span>
          {[
            { id: "semua", label: "Semua" },
            { id: "7hari", label: "7 Hari" },
            { id: "30hari", label: "30 Hari" },
            { id: "bulanIni", label: "Bulan Ini" },
            { id: "custom", label: "Kustom" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id as DatePreset)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all flex-shrink-0 ${
                filterState.presetTanggal === preset.id
                  ? "bg-[#003247] text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}

          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 text-xs font-medium transition-colors ml-1 flex-shrink-0"
              title="Reset semua filter"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-border/60">
        {/* Custom Date Range inputs if custom or active */}
        {filterState.presetTanggal === "custom" && (
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Tgl Mulai
              </label>
              <input
                type="date"
                value={filterState.tanggalAwal}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    tanggalAwal: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Tgl Sampai
              </label>
              <input
                type="date"
                value={filterState.tanggalAkhir}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    tanggalAkhir: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
              />
            </div>
          </div>
        )}

        {/* Filter Produk */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Produk
          </label>
          <select
            value={filterState.productId}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, productId: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
          >
            <option value="semua">Semua Produk</option>
            {filterOptions.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status WO */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Status WO
          </label>
          <select
            value={filterState.status}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
          >
            <option value="semua">Semua Status</option>
            <option value="dijadwalkan">Dijadwalkan</option>
            <option value="berjalan">Berjalan</option>
            <option value="selesai">Selesai</option>
            <option value="tertunda">Tertunda</option>
            <option value="batal">Batal</option>
          </select>
        </div>

        {/* Filter PIC / Operator */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Users className="h-3 w-3" /> PIC / Operator
          </label>
          <select
            value={filterState.operatorId}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, operatorId: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
          >
            <option value="semua">Semua PIC</option>
            {filterOptions.operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nama} ({op.jabatan || op.role})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Unit Produksi */}
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Factory className="h-3 w-3" /> Unit Produksi
          </label>
          <select
            value={filterState.unitId}
            onChange={(e) =>
              setFilterState((prev) => ({ ...prev, unitId: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#003247]"
          >
            <option value="semua">Semua Unit</option>
            {filterOptions.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nama} ({u.kategori})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
