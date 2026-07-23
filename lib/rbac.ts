/**
 * lib/rbac.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Konfigurasi Role-Based Access Control (RBAC) terpusat.
 *
 * CARA PAKAI:
 * 1. Untuk melindungi sebuah halaman, tambahkan entry di ROUTE_PERMISSIONS.
 * 2. Di page.tsx yang bersangkutan, bungkus dengan:
 *
 *    <AuthGuard allowedRoles={ROUTE_PERMISSIONS["/nama-route"]}>
 *      ...konten halaman...
 *    </AuthGuard>
 *
 *    ATAU gunakan helper getRouteRoles() agar tidak perlu hard-code:
 *
 *    <AuthGuard allowedRoles={getRouteRoles("/nama-route")}>
 *
 * 3. Untuk conditional rendering di dalam komponen (misal sembunyikan tombol):
 *    const { can } = useRBAC();
 *    if (can("admin")) { ... }
 * ──────────────────────────────────────────────────────────────────────────
 */

import { UserRole } from "./auth";

// ── Tipe ─────────────────────────────────────────────────────────────────

export type RBACPermissions = Partial<Record<string, UserRole[]>>;

// ── Mapping Route → Roles yang Diizinkan ─────────────────────────────────
//
// Jika sebuah route TIDAK ada di sini, artinya semua role yang sudah login
// boleh mengaksesnya (open for all authenticated users).
//
// Tambahkan entry di bawah ini setelah role user di Firestore sudah diatur.
//
// Contoh:
//   "/pengguna":            ["admin"],
//   "/laporan":             ["admin", "manajer"],
//   "/katalogproduk":       ["admin", "manajer"],
//   "/produksi/work-order": ["admin", "manajer", "produksi"],
//   "/persediaan/bahan-baku":["admin", "gudang", "manajer"],

export const ROUTE_PERMISSIONS: RBACPermissions = {
  // ── Isi di sini setelah role user di Firestore sudah diatur ──────────
  // "/pengguna":              ["admin"],
  // "/laporan":               ["admin", "manajer"],
  // "/katalogproduk":         ["admin", "manajer"],
  // "/produksi/work-order":   ["admin", "manajer", "produksi"],
  // "/produksi/jadwal":       ["admin", "manajer", "produksi"],
  // "/produksi/unitproduksi": ["admin", "manajer"],
  // "/persediaan/bahan-baku": ["admin", "gudang", "manajer"],
  // "/persediaan/penerimaan": ["admin", "gudang"],
  // "/persediaan/pengeluaran":["admin", "gudang"],
  // "/progress":              ["admin", "produksi"],
};

// ── Helper ────────────────────────────────────────────────────────────────

/**
 * Mengembalikan daftar role yang diizinkan untuk suatu route.
 * Mengembalikan `undefined` jika route tidak diatur (semua role boleh akses).
 */
export function getRouteRoles(pathname: string): UserRole[] | undefined {
  return ROUTE_PERMISSIONS[pathname];
}

/**
 * Mengecek apakah role tertentu diizinkan mengakses suatu route.
 * Mengembalikan `true` jika route tidak diatur (open for all).
 */
export function isRoleAllowed(
  pathname: string,
  role: UserRole | undefined
): boolean {
  const allowed = ROUTE_PERMISSIONS[pathname];
  if (!allowed) return true; // tidak diatur = semua boleh
  if (!role) return false; // tidak ada role = tidak boleh
  return allowed.includes(role);
}

// ── Daftar Semua Role ─────────────────────────────────────────────────────

export const ALL_ROLES: UserRole[] = ["admin", "manajer", "kepalaTimProduksi", "kepalaGudang", "picproduksi"];

/**
 * Label Indonesia untuk setiap role, berguna untuk UI.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manajer: "Manajer",
  kepalaTimProduksi: "Kepala Tim Produksi",
  kepalaGudang: "Kepala Gudang",
  picproduksi: "PIC Produksi",
};
