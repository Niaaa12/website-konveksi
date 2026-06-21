"use client";

import { useEffect, useState } from "react";
import { getMaterials } from "@/lib/firestore";
import {
  StokKritisAlertSidebar,
  hitungStokKritis,
  type StokKritisSummary,
} from "@/components/alert/StokKritisAlert";


export function SidebarStokKritisSection() {
  const [summary, setSummary] = useState<StokKritisSummary>({
    stokKritis: 0,
    stokHabis: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const mats = await getMaterials();
        const mapped = mats.map((m) => ({
          stok: m.stokAktual,
          stokMin: m.stokMin,
        }));
        setSummary(hitungStokKritis(mapped));
      } catch (e) {
        console.error("Gagal memuat ringkasan stok kritis:", e);
      }
    }
    load();
  }, []);

  return (
    <StokKritisAlertSidebar
      stokKritis={summary.stokKritis}
      stokHabis={summary.stokHabis}
    />
  );
}

