"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/auth";
import { Loader2, ShieldAlert } from "lucide-react";



interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  unauthorizedRedirect?: string;
}

export function AuthGuard({
  children,
  allowedRoles,
  unauthorizedRedirect = "/unauthorized",
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; 

    // Layer 1: Cek apakah user sudah login
    if (!user) {
      router.replace("/login");
      return;
    }

    // Layer 2: Cek apakah role user diizinkan (RBAC)
    if (allowedRoles && allowedRoles.length > 0) {
      const isAllowed = allowedRoles.includes(user.role);
      if (!isAllowed) {
        router.replace(unauthorizedRedirect);
        return;
      }
    }
  }, [user, loading, router, allowedRoles, unauthorizedRedirect]);

  // ── State: Sedang Memuat ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  // ── State: Belum Login → render null sementara menunggu redirect ────────
  if (!user) {
    return null;
  }

  // ── State: Role Tidak Diizinkan → render null sementara menunggu redirect
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(user.role);
    if (!isAllowed) {
      // Tampilkan pesan sementara menunggu redirect
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Akses Ditolak
            </p>
            <p className="text-xs text-muted-foreground">
              Anda tidak memiliki izin untuk halaman ini.
            </p>
          </div>
        </div>
      );
    }
  }

  // ── Lolos Semua Pengecekan → Render Halaman ────────────────────────────
  return <>{children}</>;
}