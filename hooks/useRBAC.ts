"use client";

/**
 * hooks/useRBAC.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Custom hook untuk keperluan conditional rendering berbasis role.
 * Gunakan ini di dalam komponen untuk menyembunyikan/menampilkan
 * elemen UI berdasarkan role pengguna.
 *
 * CONTOH PENGGUNAAN:
 *
 *   import { useRBAC } from "@/hooks/useRBAC";
 *
 *   function MyComponent() {
 *     const { can, hasAnyRole, role, isAuthenticated } = useRBAC();
 *
 *     return (
 *       <div>
 *         {can("admin") && <button>Hapus</button>}
 *         {can(["admin", "manajer"]) && <button>Edit</button>}
 *         {hasAnyRole && <span>Selamat datang, {role}</span>}
 *       </div>
 *     );
 *   }
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/auth";

interface UseRBACReturn {
  /**
   * Cek apakah user memiliki salah satu dari role yang diberikan.
   * Bisa menerima satu role (string) atau array role.
   *
   * @example
   * can("admin")                  // true jika role === "admin"
   * can(["admin", "manajer"])     // true jika role ada dalam array
   */
  can: (roles: UserRole | UserRole[]) => boolean;

  /**
   * Mengembalikan role user saat ini, atau undefined jika belum login.
   */
  role: UserRole | undefined;

  /**
   * true jika user sudah login dan memiliki profil.
   */
  isAuthenticated: boolean;

  /**
   * true jika user sudah login dengan role apapun.
   */
  hasAnyRole: boolean;

  // Shorthand boolean per-role
  isAdmin: boolean;
  isManajer: boolean;
  isProduksi: boolean;
  isGudang: boolean;
}

export function useRBAC(): UseRBACReturn {
  const { user, isAdmin, isManajer, isProduksi, isGudang } = useAuth();

  const role = user?.role;
  const isAuthenticated = !!user;
  const hasAnyRole = isAuthenticated && !!role;

  function can(roles: UserRole | UserRole[]): boolean {
    if (!role) return false;
    if (Array.isArray(roles)) {
      return roles.includes(role);
    }
    return role === roles;
  }

  return {
    can,
    role,
    isAuthenticated,
    hasAnyRole,
    isAdmin,
    isManajer,
    isProduksi,
    isGudang,
  };
}
