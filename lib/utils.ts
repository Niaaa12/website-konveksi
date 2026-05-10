import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function stokStatus(
  aktual: number,
  minimum: number
): "Aman" | "Rendah" | "Kritis" {
  if (aktual <= minimum * 0.5) return "Kritis";
  if (aktual < minimum) return "Rendah";
  return "Aman";
}
