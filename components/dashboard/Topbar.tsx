import { getAuth } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  AlertTriangle,
  ArrowLeftRight,
  Package,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getMaterials,
  getProducts,
  getVariantsByProductIds,
  getWarehouseTransfers,
  getWorkOrders,
  type ProductVariant,
} from "@/lib/firestore";

interface TopbarProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

export interface NotifItem {
  id: string;
  type: "bahan_baku_kritis" | "produk_kritis" | "transfer_produk" | "wo_terlambat";
  title: string;
  desc: string;
  link: string;
  icon: React.ElementType;
  color: string;
  category: "bahan_baku" | "produk" | "transfer" | "produksi";
  badgeText: string;
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
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "bahan_baku" | "produk" | "transfer" | "produksi">("all");
  const { user } = useAuth();
  const router = useRouter();

  const initials = user?.nama
    ? user.nama
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "NC";

  // Ambil data notifikasi: Difilter berdasarkan Role Pengguna
  useEffect(() => {
    async function fetchNotifications() {
      if (!user || !user.role) return;

      try {
        const notifList: NotifItem[] = [];
        const role = user.role;
        const todayStr = new Date().toISOString().split("T")[0];

        // Definisikan hak akses kategori notifikasi per role pengguna
        const isAllowedBahanBaku = ["admin", "manajer", "kepalaGudang", "kepalaTimProduksi"].includes(role);
        const isAllowedProduk = ["admin", "manajer", "kepalaGudang", "kepalaTimProduksi", "picproduksi"].includes(role);
        const isAllowedTransfer = ["admin", "manajer", "kepalaGudang"].includes(role);
        const isAllowedProduksi = ["admin", "manajer", "kepalaTimProduksi", "picproduksi"].includes(role);

        // 1. Cek Stok Kritis Bahan Baku (stokAktual <= stokMin)
        if (isAllowedBahanBaku) {
          const mats = await getMaterials().catch(() => []);
          mats.forEach((m) => {
            const currentStok = m.stokAktual ?? 0;
            const minStokLimit = m.stokMin ?? 0;
            if (currentStok <= minStokLimit) {
              notifList.push({
                id: `mat-${m.id}`,
                type: "bahan_baku_kritis",
                title: `Bahan Baku Kritis: ${m.nama}`,
                desc: `Sisa stok ${currentStok} ${m.satuan || "pcs"} (Batas min: ${minStokLimit} ${m.satuan || "pcs"})`,
                link: "/persediaan/bahan-baku",
                icon: AlertTriangle,
                color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                category: "bahan_baku",
                badgeText: "Bahan Baku",
              });
            }
          });
        }

        // 2. Cek Produk Kritis (Stok Gudang Packing <= stokMin pada Varian Produk)
        if (isAllowedProduk) {
          const prods = await getProducts().catch(() => []);
          if (prods.length > 0) {
            const pIds = prods.map((p) => p.id!).filter(Boolean);
            const varsMap: Record<string, ProductVariant[]> = await getVariantsByProductIds(pIds).catch(() => ({}));
            prods.forEach((p) => {
              const variants = varsMap[p.id!] || [];
              variants.forEach((v: ProductVariant) => {
                const stokPacking = v.stokGudangPacking ?? 0;
                const minStokLimit = v.stokMin ?? 20;
                if (stokPacking <= minStokLimit) {
                  notifList.push({
                    id: `prod-${p.id}-${v.id}`,
                    type: "produk_kritis",
                    title: `Produk Kritis: ${p.nama}`,
                    desc: `${v.namaWarna} (${v.ukuran}) — Stok packing: ${stokPacking} pcs (Batas min: ${minStokLimit} pcs)`,
                    link: "/persediaan/produk-jadi",
                    icon: Package,
                    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                    category: "produk",
                    badgeText: "Produk Jadi",
                  });
                }
              });
            });
          }
        }

        // 3. Cek Transfer Produk / Mutasi Gudang Terbaru
        if (isAllowedTransfer) {
          const transfers = await getWarehouseTransfers().catch(() => []);
          transfers.slice(0, 5).forEach((t) => {
            notifList.push({
              id: `trf-${t.id}`,
              type: "transfer_produk",
              title: `Transfer Produk: ${t.nomorTransfer || "TRF"}`,
              desc: `Mutasi ${t.jumlah} pcs ${t.productName} (${t.warna} ${t.ukuran}) → Gudang Packing`,
              link: "/persediaan/transfer",
              icon: ArrowLeftRight,
              color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
              category: "transfer",
              badgeText: "Transfer",
            });
          });
        }

        // 4. Cek Work Order Terlambat / Memerlukan Perhatian Produksi
        if (isAllowedProduksi) {
          const wos = await getWorkOrders().catch(() => []);
          wos.forEach((wo) => {
            const targetDate = wo.tanggalTarget;
            const isLate = targetDate && targetDate < todayStr && wo.status !== "selesai";
            if (isLate) {
              notifList.push({
                id: `wo-${wo.id}`,
                type: "wo_terlambat",
                title: `WO Terlambat: ${wo.nomor}`,
                desc: `Target: ${targetDate} | Status: ${wo.status} (${wo.jumlahSelesai}/${wo.jumlahTarget} pcs)`,
                link: role === "picproduksi" ? "/progress" : "/produksi/work-order",
                icon: Clock,
                color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
                category: "produksi",
                badgeText: "WO Terlambat",
              });
            }
          });
        }

        setNotifications(notifList);
      } catch (err) {
        console.error("Gagal memuat notifikasi sistem:", err);
      }
    }

    fetchNotifications();
  }, [user]);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  async function handleLogout() {
    await logout();
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

      {/* Notifikasi Multi-Kategori */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotif(!showNotif);
            setShowProfile(false);
          }}
          className="relative rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        {showNotif && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowNotif(false)}
            />
            <div className="absolute right-0 top-full mt-2 z-20 w-84 sm:w-96 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
              {/* Header Notifikasi */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-[#003247] dark:text-sky-400" />
                  Notifikasi Persediaan & Sistem
                </span>
                <span className="rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                  {notifications.length} Info
                </span>
              </div>

              {/* Tab Filter Notifikasi */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/10 text-[11px] overflow-x-auto">
                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap",
                    activeTab === "all"
                      ? "bg-[#003247] text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  Semua ({notifications.length})
                </button>
                {notifications.some((n) => n.category === "bahan_baku") && (
                  <button
                    onClick={() => setActiveTab("bahan_baku")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap",
                      activeTab === "bahan_baku"
                        ? "bg-red-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Bahan Baku ({notifications.filter((n) => n.category === "bahan_baku").length})
                  </button>
                )}
                {notifications.some((n) => n.category === "produk") && (
                  <button
                    onClick={() => setActiveTab("produk")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap",
                      activeTab === "produk"
                        ? "bg-amber-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Produk ({notifications.filter((n) => n.category === "produk").length})
                  </button>
                )}
                {notifications.some((n) => n.category === "transfer") && (
                  <button
                    onClick={() => setActiveTab("transfer")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap",
                      activeTab === "transfer"
                        ? "bg-blue-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Transfer ({notifications.filter((n) => n.category === "transfer").length})
                  </button>
                )}
                {notifications.some((n) => n.category === "produksi") && (
                  <button
                    onClick={() => setActiveTab("produksi")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap",
                      activeTab === "produksi"
                        ? "bg-purple-600 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    WO ({notifications.filter((n) => n.category === "produksi").length})
                  </button>
                )}
              </div>

              {/* List Notifikasi */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {(() => {
                  const filtered =
                    activeTab === "all"
                      ? notifications
                      : notifications.filter((n) => n.category === activeTab);

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        Tidak ada notifikasi dalam kategori ini.
                      </div>
                    );
                  }

                  return filtered.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setShowNotif(false);
                          router.push(item.link);
                        }}
                        className="p-3 hover:bg-muted/40 transition-colors cursor-pointer flex items-start gap-3"
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5",
                            item.color
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {item.title}
                            </p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium flex-shrink-0">
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="border-t border-border p-2 bg-muted/10 text-center">
                <span className="text-[10px] text-muted-foreground">
                  Pembaruan data otomatis berdasarkan persediaan
                </span>
              </div>
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
                      roleBadge[user.role] || "bg-muted text-foreground"
                    )}
                  >
                    {user.jabatan || user.role}
                  </span>
                )}
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/pengaturan");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Pengaturan Akun
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