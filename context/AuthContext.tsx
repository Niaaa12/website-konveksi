"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { onAuthChange, getUserProfile, UserProfile } from "@/lib/auth";

// ── Tipe Context ─────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null; // profil lengkap dari Firestore
  fireUser: User | null; // user Firebase mentah
  loading: boolean; // masih memuat state awal
  isAdmin: boolean;
  isManajer: boolean;
  isProduksi: boolean;
  isGudang: boolean;
  isPICProduksi: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  fireUser: null,
  loading: true,
  isAdmin: false,
  isManajer: false,
  isProduksi: false,
  isGudang: false,
  isPICProduksi: false,
});

// ── Provider ──────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fireUser, setFireUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFireUser(fbUser);

      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    fireUser,
    loading,
    isAdmin: user?.role === "admin",
    isManajer: user?.role === "manajer",
    isProduksi: user?.role === "kepalaTimProduksi",
    isGudang: user?.role === "kepalaGudang",
    isPICProduksi: user?.role === "picproduksi",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}
