"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

/**
 * Halaman 403 — Akses Ditolak
 * Ditampilkan ketika user login tapi tidak memiliki role yang diperlukan.
 */
export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        {/* Ikon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-12 w-12 text-destructive" strokeWidth={1.5} />
        </div>

        {/* Kode & Judul */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-destructive">
            Error 403
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Akses Ditolak
          </h1>
          <p className="text-sm text-muted-foreground">
            Anda tidak memiliki izin untuk mengakses halaman ini.
            Hubungi administrator jika Anda merasa ini adalah kesalahan.
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[#004766] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#003247]"
          >
            <Home className="h-4 w-4" />
            Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
