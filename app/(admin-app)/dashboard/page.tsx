"use client";

import React, { useEffect, useState, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardUnitProduksiSummary } from "@/components/dashboard/DashboardUnitProduksiSummary";
import { DashboardTahapProduksiSummary } from "@/components/tahapproduksi/DashboardTahapProduksiSummary";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  ArrowRight,
  Factory,
  Package,
  TrendingUp,
  Zap,
  Loader2,
  X,
  Check,
  BellRing,
  ClipboardList,
  CheckCircle,
  Clock,
  Boxes,
  Truck,
  ShieldCheck,
  UserCheck,
  PlayCircle,
  PlusCircle,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import { cn } from "@/lib/utils";
import {
  getDashboardStats,
  getMaterials,
  getProductionUnits,
  getWorkOrders,
  getProducts,
  getKritisPackingVariants,
  createWarehouseTransfer,
  ProductionUnit,
  WorkOrder,
  Material,
  Product,
} from "@/lib/firestore";
import { messaging, db } from "@/lib/firebase";
import { getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "#003247",
  "#005577",
  "#0088cc",
  "#33aaff",
  "#88ccff",
  "#b3e0ff",
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Berjalan:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    Selesai: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    Tertunda:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    Dijadwalkan:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
        map[status] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {status}
    </span>
  );
}

function StokBadge({ stok, stokMin }: { stok: number; stokMin: number }) {
  if (stok <= 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
        <span className="h-1 w-1 rounded-full bg-red-500" />
        Habis
      </span>
    );
  if (stok <= stokMin)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <span className="h-1 w-1 rounded-full bg-amber-500" />
        Kritis
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Aman
    </span>
  );
}

export default function DashboardPage() {
  const {
    user,
    isAdmin,
    isManajer,
    isProduksi,
    isGudang,
    isPICProduksi,
    loading: authLoading,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    woAktif: 0,
    woTertunda: 0,
    woDijadwalkan: 0,
    stokKritis: 0,
    totalProgress: 0,
    totalTarget: 0,
  });
  const [nilaiPersediaan, setNilaiPersediaan] = useState(0);
  const [efisiensiProd, setEfisiensiProd] = useState(0);
  const [rawWos, setRawWos] = useState<WorkOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [recentWos, setRecentWos] = useState<any[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<ProductionUnit[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [distData, setDistData] = useState<{ name: string; value: number }[]>(
    []
  );

  const [kritisPacking, setKritisPacking] = useState<any[]>([]);
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [transferJumlah, setTransferJumlah] = useState<number>(0);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      setShowBanner(true);
    }
  }, []);

  async function handleAktifkanNotifikasi() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setShowBanner(false);
        if (!messaging) {
          console.error("Firebase messaging tidak didukung di lingkungan ini.");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
        });

        if (currentUser?.uid && token) {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
          });
          alert("Notifikasi berhasil diaktifkan!");
        }
      } else {
        alert("Izin notifikasi ditolak.");
      }
    } catch (error) {
      console.error("Error mengaktifkan notifikasi:", error);
    }
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferTarget) return;
    if (
      transferJumlah <= 0 ||
      transferJumlah > transferTarget.stokGudangBesar
    ) {
      setTransferError("Jumlah transfer tidak valid.");
      return;
    }
    setTransferring(true);
    setTransferError("");
    try {
      await createWarehouseTransfer({
        nomorTransfer: `TRF-${Date.now().toString().slice(-6)}`,
        productId: transferTarget.productId,
        productName: transferTarget.productName,
        variantId: transferTarget.variantId,
        warna: transferTarget.warna,
        ukuran: transferTarget.ukuran,
        jumlah: transferJumlah,
        tanggalTransfer: new Date().toISOString().slice(0, 10),
        catatan: "Transfer cepat dari Dashboard Peringatan Stok",
        dibuatOleh:
          user?.nama ?? currentUser?.displayName ?? currentUser?.email ?? "Kepala Gudang",
      });
      setTransferTarget(null);

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendToAll: true,
          title: "📦 Transfer Produk",
          body: `${transferJumlah} pcs ${transferTarget.productName} dipindahkan ke Gudang Packing.`,
          link: "/persediaan/transfer",
        }),
      }).catch((err) => console.error("Gagal notif transfer:", err));

      window.location.reload();
    } catch (err: any) {
      setTransferError(err.message ?? "Gagal memproses transfer.");
    } finally {
      setTransferring(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const auth = getAuth();
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
        }

        const [dashStats, materials, units, wos, prods, kpVars] =
          await Promise.all([
            getDashboardStats().catch(() => ({
              woAktif: 0,
              woTertunda: 0,
              woDijadwalkan: 0,
              stokKritis: 0,
              totalProgress: 0,
              totalTarget: 0,
            })),
            getMaterials().catch(() => []),
            getProductionUnits().catch(() => []),
            getWorkOrders().catch(() => []),
            getProducts().catch(() => []),
            getKritisPackingVariants().catch(() => []),
          ]);

        setStats(dashStats);
        setUnitsList(units);
        setKritisPacking(kpVars);
        setRawWos(wos);
        setRawMaterials(materials);
        setProductsList(prods);

        // Auto Notifications Check
        if (!sessionStorage.getItem("notified_bahan_kritis")) {
          const bahanKritis = materials.filter((m) => m.stokAktual <= m.stokMin);
          if (bahanKritis.length > 0) {
            fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sendToAll: true,
                title: "⚠️ Peringatan Bahan Baku",
                body: `Terdapat ${bahanKritis.length} bahan baku dengan stok kritis.`,
                link: "/persediaan/bahan-baku",
              }),
            }).catch(console.error);
            sessionStorage.setItem("notified_bahan_kritis", "true");
          }
        }

        if (!sessionStorage.getItem("notified_produk_kritis") && kpVars.length > 0) {
          fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sendToAll: true,
              title: "⚠️ Produk Jadi Menipis",
              body: `Terdapat ${kpVars.length} varian produk yang kritis di Gudang Packing.`,
              link: "/persediaan/produk-jadi",
            }),
          }).catch(console.error);
          sessionStorage.setItem("notified_produk_kritis", "true");
        }

        const totalVal = materials.reduce(
          (sum, m) => sum + m.stokAktual * m.harga,
          0
        );
        setNilaiPersediaan(totalVal);

        const avgEff =
          Array.isArray(units) && units.length > 0
            ? Math.round(
              units.reduce((sum, u) => sum + Number(u?.efisiensi || 0), 0) /
              units.length
            )
            : 0;
        setEfisiensiProd(avgEff);

        const mappedWos = wos.slice(0, 5).map((wo) => {
          const prod = prods.find((p) => p.id === wo.productId);
          return {
            id: wo.nomor || "",
            produk: prod ? prod.nama : "Produk Tidak Dikenal",
            target: wo.jumlahTarget,
            selesai: wo.jumlahSelesai || 0,
            status: wo.status.charAt(0).toUpperCase() + wo.status.slice(1),
          };
        });
        setRecentWos(mappedWos);

        const mappedMaterials = materials.slice(0, 5).map((m) => ({
          id: m.id || "",
          nama: m.nama,
          stok: m.stokAktual,
          stokMin: m.stokMin,
          satuan: m.satuan,
          harga: m.harga,
        }));
        setRecentMaterials(mappedMaterials);

        const categories = [
          "Kain",
          "Benang",
          "Aksesoris",
          "Pewarna",
          "Kemasan",
          "Lainnya",
        ];
        const distribution = categories
          .map((cat) => {
            const filtered = materials.filter((m) => {
              const mCat = m.kategoriId?.startsWith("cat-")
                ? m.kategoriId.replace("cat-", "")
                : m.kategoriId || "";
              return mCat
                .toLowerCase()
                .includes(cat.toLowerCase().substring(0, 4));
            });
            const value = filtered.reduce(
              (sum, m) => sum + m.stokAktual * m.harga,
              0
            );
            return { name: cat, value };
          })
          .filter((d) => d.value > 0);
        setDistData(distribution);
      } catch (e) {
        console.error("Gagal memuat data dashboard:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter My Work Orders for Operator / PIC Produksi
  const myWorkOrders = useMemo(() => {
    if (!user) return rawWos.slice(0, 5);
    const matched = rawWos.filter(
      (w) => w.operatorId === user.uid || w.operatorId === currentUser?.uid
    );
    return matched.length > 0 ? matched : rawWos;
  }, [rawWos, user, currentUser]);

  const chartData = [
    { name: "Des", target: 4000, aktual: 3800 },
    { name: "Jan", target: 4500, aktual: 4200 },
    { name: "Feb", target: 5000, aktual: 4900 },
    { name: "Mar", target: 5500, aktual: 5100 },
    { name: "Apr", target: 6000, aktual: 5800 },
    {
      name: "Mei",
      target: stats.totalTarget || 5000,
      aktual: stats.totalProgress || 4500,
    },
  ];

  if (loading || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">Memuat dashboard kustom...</p>
        </div>
      </div>
    );
  }

  // Get Role Display Text & Color Badge
  const getRoleHeaderInfo = () => {
    if (isAdmin) {
      return {
        roleTitle: "Administrator Sistem",
        badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
        description: "Ringkasan Eksekutif & Pengawasan Operasional Seluruh Sistem Konveksi",
        icon: ShieldCheck,
      };
    }
    if (isManajer) {
      return {
        roleTitle: "Manajer Operasional",
        badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
        description: "Pengawasan Performa Produksi, Valuasi Persediaan & Efisiensi Unit Mesin",
        icon: UserCheck,
      };
    }
    if (isProduksi) {
      return {
        roleTitle: "Kepala Tim Produksi",
        badgeBg: "bg-teal-100 text-teal-800 border-teal-200",
        description: "Monitoring Throughput Lini Produksi, Work Order & Performa Mesin",
        icon: Factory,
      };
    }
    if (isGudang) {
      return {
        roleTitle: "Kepala Gudang",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
        description: "Manajemen Persediaan Bahan Baku & Transfer Produk Jadi ke Packing",
        icon: Package,
      };
    }
    return {
      roleTitle: "Operator / PIC Produksi",
      badgeBg: "bg-cyan-100 text-cyan-800 border-cyan-200",
      description: "Penugasan Pekerjaan, Target Output Harian & Update Progress Work Order",
      icon: PlayCircle,
    };
  };

  const roleInfo = getRoleHeaderInfo();
  const HeaderIcon = roleInfo.icon;

  return (
    <div className="space-y-6">
      {/* ─── BANNER UCAPAN SELAMAT DATANG PER ROLE ─── */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-[#003247]/5 via-card to-card p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-[#003247] p-3.5 text-white shadow-xs flex-shrink-0">
            <HeaderIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-foreground">
                Selamat Datang, {user?.nama || currentUser?.displayName || "Pengguna"}!
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold border",
                  roleInfo.badgeBg
                )}
              >
                {roleInfo.roleTitle}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {roleInfo.description}
            </p>
          </div>
        </div>

        {/* Action Buttons based on Role */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {(isAdmin || isProduksi) && (
            <Link
              href="/produksi/work-order"
              className="flex items-center gap-1.5 rounded-xl bg-[#003247] hover:bg-[#004a6e] text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Work Order Baru
            </Link>
          )}
          {(isAdmin || isGudang) && (
            <Link
              href="/persediaan/bahan-baku"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted/40 text-foreground px-3.5 py-2 text-xs font-semibold transition-all"
            >
              <Boxes className="h-3.5 w-3.5 text-[#003247]" /> Kelola Bahan
            </Link>
          )}
          {isPICProduksi && (
            <Link
              href="/progress"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Update Progress Saya
            </Link>
          )}
        </div>
      </div>

      {/* Banner Notifikasi Push Notifications */}
      {showBanner && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <BellRing className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Aktifkan Notifikasi Tugas
              </p>
              <p className="text-xs text-blue-700">
                Terima pemberitahuan tugas & Work Order baru langsung di perangkat ini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAktifkanNotifikasi}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Aktifkan
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 text-blue-400 hover:text-blue-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TAMPILAN DASHBOARD UNTUK OPERATOR / PIC PRODUKSI                       */}
      {/* ========================================================================= */}
      {isPICProduksi && (
        <div className="space-y-6">
          {/* KPI Cards Operator */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Work Order Saya"
              value={String(myWorkOrders.length)}
              subtitle="Tugas aktif dialokasikan"
              icon={ClipboardList}
              iconBg="bg-blue-100 text-blue-700"
              trend="neutral"
              trendValue="Tugas"
            />
            <StatCard
              title="Target Output Saya"
              value={`${myWorkOrders.reduce((sum, w) => sum + (w.jumlahTarget || 0), 0).toLocaleString("id-ID")} pcs`}
              subtitle="Total volume target"
              icon={Factory}
              iconBg="bg-cyan-100 text-cyan-700"
              trend="up"
              trendValue="Target"
            />
            <StatCard
              title="Realisasi Selesai"
              value={`${myWorkOrders.reduce((sum, w) => sum + (w.jumlahSelesai || 0), 0).toLocaleString("id-ID")} pcs`}
              subtitle="Output berhasil diproses"
              icon={CheckCircle}
              iconBg="bg-emerald-100 text-emerald-700"
              trend="up"
              trendValue="Selesai"
            />
            <StatCard
              title="Tingkat Kualitas"
              value={`${(() => {
                const totalTarget = myWorkOrders.reduce((s, w) => s + (w.jumlahTarget || 0), 0);
                const totalSelesai = myWorkOrders.reduce((s, w) => s + (w.jumlahSelesai || 0), 0);
                return totalTarget > 0 ? Math.min(100, Math.round((totalSelesai / totalTarget) * 100)) : 0;
              })()}%`}
              subtitle="Pencapaian penyelesaian"
              icon={Zap}
              iconBg="bg-purple-100 text-purple-700"
              trend="up"
              trendValue="Progress"
            />
          </div>

          {/* Table Task Assignment */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#003247]" /> Daftar Work Order Penugasan Saya
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Input hasil pengerjaan output dan cacat melalui menu progress
                </p>
              </div>
              <Link
                href="/progress"
                className="text-xs font-semibold text-[#003247] hover:underline flex items-center gap-1"
              >
                Ke Halaman Progress Saya <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">No. WO</th>
                    <th className="py-3 px-4 font-semibold">Produk</th>
                    <th className="py-3 px-4 font-semibold text-center">Tahap Produksi</th>
                    <th className="py-3 px-4 font-semibold text-right">Target Output</th>
                    <th className="py-3 px-4 font-semibold text-right">Hasil Selesai</th>
                    <th className="py-3 px-4 font-semibold text-center">Pencapaian</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {myWorkOrders.map((wo) => {
                    const pct = wo.jumlahTarget > 0 ? Math.min(100, Math.round(((wo.jumlahSelesai || 0) / wo.jumlahTarget) * 100)) : 0;
                    return (
                      <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-foreground">{wo.nomor}</td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {productsList.find((p) => p.id === wo.productId)?.nama || wo.productId}
                        </td>
                        <td className="py-3 px-4 text-center capitalize">{wo.tahapSaatIni}</td>
                        <td className="py-3 px-4 text-right font-mono">{wo.jumlahTarget} pcs</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">{wo.jumlahSelesai || 0} pcs</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-[11px] font-semibold">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={wo.status.charAt(0).toUpperCase() + wo.status.slice(1)} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href="/progress"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#003247] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#004a6e]"
                          >
                            Update Progress
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAMPILAN DASHBOARD UNTUK KEPALA GUDANG                                  */}
      {/* ========================================================================= */}
      {isGudang && (
        <div className="space-y-6">
          {/* KPI Cards Gudang */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Nilai Persediaan Bahan Baku"
              value={`Rp ${nilaiPersediaan.toLocaleString("id-ID")}`}
              subtitle="Nilai aset gudang bahan"
              icon={Package}
              iconBg="bg-blue-100 text-blue-700"
              trend="up"
              trendValue="Bahan Baku"
            />
            <StatCard
              title="Stok Bahan Kritis"
              value={String(stats.stokKritis)}
              subtitle="Di bawah batas min"
              icon={AlertTriangle}
              iconBg={stats.stokKritis > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
              trend={stats.stokKritis > 0 ? "down" : "up"}
              trendValue="Restok"
            />
            <StatCard
              title="Varian Kritis (Packing)"
              value={String(kritisPacking.length)}
              subtitle="Perlu transfer dari gudang besar"
              icon={Truck}
              iconBg="bg-amber-100 text-amber-700"
              trend="neutral"
              trendValue="Transfer"
            />
            <StatCard
              title="Total Item Bahan Baku"
              value={String(rawMaterials.length)}
              subtitle="Jenis material terdaftar"
              icon={Boxes}
              iconBg="bg-purple-100 text-purple-700"
              trend="neutral"
              trendValue="Katalog"
            />
          </div>

          {/* Grid Section 1: Tables Bahan Baku Kritis & Produk Packing Kritis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabel Bahan Baku Kritis */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-[#003247]" /> Status Stok Bahan Baku
                </h2>
                <Link
                  href="/persediaan/bahan-baku"
                  className="text-xs text-[#003247] hover:underline flex items-center gap-1"
                >
                  Kelola Bahan <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-muted-foreground border-b border-border pb-2">
                      <th className="pb-2">Bahan Baku</th>
                      <th className="pb-2 text-right">Stok Aktual</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentMaterials.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/10">
                        <td className="py-2.5 font-medium text-foreground">{m.nama}</td>
                        <td className="py-2.5 text-right font-mono">{m.stok.toLocaleString("id-ID")} {m.satuan}</td>
                        <td className="py-2.5 text-right">
                          <StokBadge stok={m.stok} stokMin={m.stokMin} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabel Produk Kritis Gudang Packing & Transfer Cepat */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {/* Header Panel */}
              <div className="flex items-center justify-between border-b border-border bg-muted/10 px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Varian Kritis Gudang Packing ({kritisPacking.length})
                </h2>
                <Link
                  href="/persediaan/transfer"
                  className="flex items-center gap-1 text-xs font-medium text-[#003247] transition-colors hover:text-[#004a6e] hover:underline"
                >
                  Log Transfer <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/20 text-muted-foreground">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3.5 font-semibold">Produk</th>
                      <th className="whitespace-nowrap px-5 py-3.5 font-semibold">Varian</th>
                      <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold">Stok Gudang Besar</th>
                      <th className="whitespace-nowrap px-5 py-3.5 text-right font-semibold">Stok Packing</th>
                      <th className="whitespace-nowrap px-5 py-3.5 text-center font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {kritisPacking.slice(0, 5).map((kp, i) => (
                      <tr key={i} className="group transition-colors hover:bg-muted/10">
                        {/* Kolom Produk */}
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-foreground">
                          {kp.productName}
                        </td>

                        {/* Kolom Varian (Diubah menjadi style badge) */}
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-1 text-[11px] font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/20">
                            {kp.warna} - {kp.ukuran}
                          </span>
                        </td>

                        {/* Kolom Stok Gudang Besar */}
                        <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-muted-foreground">
                          {kp.stokGudangBesar} <span className="text-[10px]">pcs</span>
                        </td>

                        {/* Kolom Stok Packing (Diubah menjadi red badge agar lebih "Alert") */}
                        <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/50">
                            {kp.stokGudangPacking} pcs
                          </span>
                        </td>

                        {/* Kolom Aksi */}
                        <td className="whitespace-nowrap px-5 py-3 text-center">
                          <button
                            onClick={() => {
                              setTransferTarget(kp);
                              setTransferJumlah(Math.min(20, kp.stokGudangBesar));
                            }}
                            className="inline-flex items-center justify-center rounded-md bg-[#003247] px-3 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-[#004a6e] hover:shadow-sm active:scale-95"
                          >
                            Transfer Cepat
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Empty State yang lebih rapi */}
                    {kritisPacking.length === 0 && (
                      <tr>
                        <td colSpan={5} className="bg-muted/5 py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {/* Pastikan Anda sudah import ikon ini dari lucide-react jika ingin dipakai, 
                    atau hapus ikonnya jika tidak diperlukan */}
                            <div className="mb-1 rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="font-medium text-foreground">Stok Gudang Packing Aman</span>
                            <span className="text-xs">Tidak ada varian yang mencapai batas kritis.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Distribusi Persediaan Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold">Distribusi Persediaan Bahan Baku</h2>
              <p className="text-xs text-muted-foreground">Berdasarkan kategori bahan (nilai Rp)</p>
            </div>
            <div className="flex justify-center items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={distData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`} />
                  <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TAMPILAN DASHBOARD UNTUK KEPA TIM PRODUKSI                              */}
      {/* ========================================================================= */}
      {isProduksi && (
        <div className="space-y-6">
          {/* KPI Cards Produksi */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Work Order Aktif"
              value={String(stats.woAktif)}
              subtitle={`${stats.woDijadwalkan} Dijadwalkan, ${stats.woTertunda} Tertunda`}
              icon={TrendingUp}
              iconBg="bg-blue-100 text-blue-700"
              trend="up"
              trendValue="WO Aktif"
            />
            <StatCard
              title="Target Output Produksi"
              value={`${stats.totalTarget.toLocaleString("id-ID")} pcs`}
              subtitle={`Realisasi: ${stats.totalProgress.toLocaleString("id-ID")} pcs`}
              icon={Factory}
              iconBg="bg-emerald-100 text-emerald-700"
              trend="up"
              trendValue="Volume"
            />
            <StatCard
              title="Efisiensi Rata-Rata Unit"
              value={`${efisiensiProd}%`}
              subtitle="Score performa mesin"
              icon={Zap}
              iconBg="bg-purple-100 text-purple-700"
              trend="up"
              trendValue="Efisiensi"
            />
            <StatCard
              title="Unit Mesin Terdaftar"
              value={String(unitsList.length)}
              subtitle={`${unitsList.filter((u) => u.status === "aktif").length} Unit Aktif`}
              icon={Layers}
              iconBg="bg-cyan-100 text-cyan-700"
              trend="neutral"
              trendValue="Unit"
            />
          </div>

          {/* Tren Chart & WO Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Tren Realisasi Output Produksi</h2>
                  <p className="text-xs text-muted-foreground">Target vs Realisasi Aktual (unit)</p>
                </div>
                <Link href="/produksi/work-order" className="text-xs text-[#003247] hover:underline flex items-center gap-1">
                  Lihat WO <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="target" name="Target" fill="#b3e0ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aktual" name="Aktual" fill="#003247" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Work Order Terkini</h2>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left font-semibold text-muted-foreground border-b border-border pb-2">
                      <th className="pb-2">WO</th>
                      <th className="pb-2 text-right">Target</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentWos.map((wo) => (
                      <tr key={wo.id} className="hover:bg-muted/10">
                        <td className="py-2.5 font-mono">{wo.id}</td>
                        <td className="py-2.5 text-right font-mono">{wo.target}</td>
                        <td className="py-2.5 text-center">
                          <StatusBadge status={wo.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DashboardUnitProduksiSummary />
          <DashboardTahapProduksiSummary />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAMPILAN DASHBOARD UNTUK ADMIN & MANAJER OPERASIONAL (DEFAULT)         */}
      {/* ========================================================================= */}
      {(isAdmin || isManajer || (!isProduksi && !isGudang && !isPICProduksi)) && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Output Produksi"
              value={stats.totalProgress.toLocaleString("id-ID")}
              subtitle={`Target: ${stats.totalTarget.toLocaleString("id-ID")}`}
              icon={Factory}
              iconBg="bg-blue-100"
              trend="up"
              trendValue="Aktif"
            />
            <StatCard
              title="Efisiensi Produksi"
              value={`${efisiensiProd}%`}
              subtitle="Rata-rata mesin"
              icon={Zap}
              iconBg="bg-emerald-100"
              trend="up"
              trendValue="Optimum"
            />
            <StatCard
              title="Nilai Persediaan"
              value={`Rp ${nilaiPersediaan.toLocaleString("id-ID")}`}
              subtitle="Nilai aset gudang"
              icon={Package}
              iconBg="bg-violet-100"
              trend="up"
              trendValue="Gudang"
            />
            <StatCard
              title="Work Order Aktif"
              value={String(stats.woAktif)}
              subtitle={`${stats.woDijadwalkan} Dijadwalkan, ${stats.woTertunda} Tertunda`}
              icon={TrendingUp}
              iconBg="bg-amber-100"
              trend="neutral"
              trendValue="Siklus"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tren Produksi */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold">Tren Produksi 6 Bulan</h2>
                  <p className="text-xs text-muted-foreground">Target vs Aktual (unit)</p>
                </div>
                {(isAdmin || isProduksi) && (
                  <Link
                    href="/produksi/work-order"
                    className="text-xs text-[#003247] hover:underline flex items-center gap-1"
                  >
                    Lihat Work Order <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="target" name="Target" fill="#b3e0ff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aktual" name="Aktual" fill="#003247" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribusi Persediaan */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Distribusi Persediaan</h2>
                <p className="text-xs text-muted-foreground">Berdasarkan kategori bahan (nilai Rp)</p>
              </div>
              <div className="flex justify-center items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie data={distData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {distData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`} />
                    <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Work Order Aktif */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Work Order Terkini</h2>
                {(isAdmin || isProduksi) && (
                  <Link href="/produksi/work-order" className="text-xs text-[#003247] hover:underline flex items-center gap-1">
                    Lihat semua <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border pb-2">
                        <th className="pb-2">ID</th>
                        <th className="pb-2">Produk</th>
                        <th className="pb-2 text-right">Target</th>
                        <th className="pb-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentWos.map((wo) => (
                        <tr key={wo.id} className="text-xs hover:bg-muted/10">
                          <td className="py-2.5 font-mono text-muted-foreground">{wo.id}</td>
                          <td className="py-2.5 font-medium text-foreground">{wo.produk}</td>
                          <td className="py-2.5 text-right font-medium">{wo.target}</td>
                          <td className="py-2.5 text-center">
                            <StatusBadge status={wo.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stok Kritis */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Status Stok Bahan Baku</h2>
                {(isAdmin || isGudang) && (
                  <Link href="/persediaan/bahan-baku" className="text-xs text-[#003247] hover:underline flex items-center gap-1">
                    Lihat semua <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-muted-foreground border-b border-border pb-2">
                        <th className="pb-2">Bahan Baku</th>
                        <th className="pb-2 text-right">Stok</th>
                        <th className="pb-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentMaterials.map((m) => (
                        <tr key={m.id} className="text-xs hover:bg-muted/10">
                          <td className="py-2.5 font-medium text-foreground">{m.nama}</td>
                          <td className="py-2.5 text-right text-muted-foreground">{m.stok.toLocaleString("id-ID")} {m.satuan}</td>
                          <td className="py-2.5 text-right">
                            <StokBadge stok={m.stok} stokMin={m.stokMin} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Status Mesin & Tahap Produksi */}
          <DashboardUnitProduksiSummary />
          <DashboardTahapProduksiSummary />
        </div>
      )}

      {/* Transfer Dialog Modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold text-foreground">
                Proses Transfer Stok Cepat
              </h3>
              <button
                onClick={() => setTransferTarget(null)}
                className="rounded-lg p-1 hover:bg-muted/50 transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="p-6 space-y-4">
                <div className="rounded-xl bg-muted/40 p-4 space-y-1.5 text-xs text-foreground">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produk:</span>
                    <span className="font-semibold text-right">{transferTarget.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Varian:</span>
                    <span className="font-medium text-right">{transferTarget.warna} · {transferTarget.ukuran}</span>
                  </div>
                  <hr className="border-border my-1.5" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stok Gudang Besar:</span>
                    <span className="font-mono font-semibold text-emerald-600">{transferTarget.stokGudangBesar} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stok Gudang Packing:</span>
                    <span className="font-mono text-red-500">{transferTarget.stokGudangPacking} pcs (min. {transferTarget.stokMin})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-foreground">
                    Jumlah Transfer (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={transferTarget.stokGudangBesar}
                    value={transferJumlah}
                    onChange={(e) => setTransferJumlah(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
                    required
                  />
                </div>

                {transferError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{transferError}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <button
                  type="button"
                  onClick={() => setTransferTarget(null)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50 text-foreground"
                  disabled={transferring}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] disabled:opacity-60 cursor-pointer"
                >
                  {transferring ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Kirim Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
