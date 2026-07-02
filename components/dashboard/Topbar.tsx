"use client";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TopbarProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

const roleBadge: Record<string, string> = {
  admin: "bg-[#C0E1D2] text-[#124170]",
  manajer: "bg-[#C0E1D2] text-[#124170]",
  produksi: "bg-[#C0E1D2] text-[#124170]",
  gudang: "bg-[#C0E1D2] text-[#124170]",
};

export function TopBar({ onMenuClick, title, subtitle }: TopbarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const auth = getAuth();

  const initials = user?.nama
    ? user.nama
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "NC";

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  async function handleLogout() {
    await logout();
    // Hapus cookie __session agar middleware memblokir akses ke halaman admin
    document.cookie = "__session=; path=/; max-age=0; SameSite=Strict";
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6 gap-4">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 hover:bg-accent lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            {subtitle}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 w-56">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Dark mode */}
      <button
        onClick={toggleDark}
        className="rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        {darkMode ? (
          <Sun className="h-4.5 w-4.5" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>

      {/* Notifikasi */}
      <div className="relative">
        <button
          onClick={() => setShowNotif(!showNotif)}
          className="relative rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
        </button>

        {showNotif && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowNotif(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-20 w-80 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Notifikasi</span>
              </div>
              <div className="max-h-80 overflow-y-auto"></div>
            </div>
          </>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => {
            setShowProfile(!showProfile);
            setShowNotif(false);
          }}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: "#003247" }}
          >
            {initials}
          </div>
          <span className="hidden sm:block text-xs font-medium text-foreground max-w-[90px] truncate">
            {user?.nama ?? "Pengguna"}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
        </button>

        {showProfile && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowProfile(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-20 w-56 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#003247" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.nama ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email ?? "—"}
                    </p>
                  </div>
                </div>
                {user?.role && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      roleBadge[user.role]
                    )}

                  >
                    {user.jabatan || user.role}
                  </span>
                )}
              </div>
              <div className="p-1.5">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Profil saya
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar dari sistem
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}