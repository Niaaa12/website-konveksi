"use client";

import { cn } from "@/lib/utils";
import { Download, Edit, Eye, Filter, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";

export default function WorkOrderPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const statuses = ["Semua", "Berjalan", "Selesai", "Tertunda", "Dijadwalkan"];

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari work order atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#093C5D] text-primary-foreground hover:bg-[#093C5D]/90 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Buat WO</span>
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              filterStatus === s
                ? "bg-[#093C5D] text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            )}
          >
            {s}
            {s !== "Semua" && (
              <span className="ml-1.5 text-[10px] opacity-70"></span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Produk
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Lini
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                  Target
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground min-w-[140px]">
                  Progress
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                  Target Selesai
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Menampilkan ... dari ... work order
          </p>
          <div className="flex gap-1">
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent disabled:opacity-50">
              Sebelumnya
            </button>
            <button className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent">
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
