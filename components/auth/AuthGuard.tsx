// src/components/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HALAMAN_AKSES, HALAMAN_AWAL, type UserRole } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ok" | "redirect">(
    "loading"
  );

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Belum login → ke halaman login
        router.replace(`/login?redirect=${pathname}`);
        return;
      }

      // Ambil role dari Firestore
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.data()?.role as UserRole | undefined;

      if (!role) {
        router.replace("/login");
        return;
      }

      // Cek apakah role ini boleh akses halaman sekarang
      const roleYangBoleh = HALAMAN_AKSES[pathname];
      if (roleYangBoleh && !roleYangBoleh.includes(role)) {
        // Tidak punya akses → arahkan ke halaman awal sesuai role
        router.replace(HALAMAN_AWAL[role]);
        return;
      }

      setStatus("ok");
    });

    return () => unsub();
  }, [pathname, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
      </div>
    );
  }

  return <>{children}</>;
}
