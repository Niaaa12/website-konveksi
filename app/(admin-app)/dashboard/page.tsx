"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardUnitProduksiSummary } from "@/components/dashboard/DashboardUnitProduksiSummary";
import { DashboardTahapProduksiSummary } from "@/components/tahapproduksi/DashboardTahapProduksiSummary";
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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [recentWos, setRecentWos] = useState<any[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<ProductionUnit[]>([]);
  const [distData, setDistData] = useState<{ name: string; value: number }[]>(
    []
  );

  // const [kritisPacking, setKritisPacking] = useState<any[]>([]);
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [transferJumlah, setTransferJumlah] = useState<number>(0);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ─── TAMBAHAN: STATE UNTUK BANNER NOTIFIKASI ───
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Mengecek apakah browser mendukung notifikasi & izin belum diberikan
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      setShowBanner(true);
    }
  }, []);

  // FUNGSI UNTUK MEMINTA IZIN & MENYIMPAN TOKEN
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

        // Menggunakan currentUser yang sudah ada di file ini
        if (currentUser?.uid && token) {
          const userRef = doc(db, "users", currentUser.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
          });
          alert("Notifikasi berhasil diaktifkan di HP ini!");
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
          currentUser?.displayName ?? currentUser?.email ?? "Kepala Gudang",
      });
      setTransferTarget(null);

      // Kirim notifikasi transfer barang
      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendToAll: true,
          title: "📦 Transfer Produk",
          body: `${transferJumlah} pcs ${transferTarget.productName} dipindahkan ke Gudang Packing.`,
          link: "/persediaan/transfer",
        }),
      }).catch(err => console.error("Gagal notif transfer:", err));

      // Reload
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
            getDashboardStats().catch((e) => {
              console.error("❌ getDashboardStats error:", e);
              return {
                woAktif: 0,
                woTertunda: 0,
                woDijadwalkan: 0,
                stokKritis: 0,
                totalProgress: 0,
                totalTarget: 0,
              };
            }),
            getMaterials().catch((e) => {
              console.error("❌ getMaterials error:", e);
              return [];
            }),
            getProductionUnits().catch((e) => {
              console.error("❌ getProductionUnits error:", e);
              return [];
            }),
            getWorkOrders().catch((e) => {
              console.error("❌ getWorkOrders error:", e);
              return [];
            }),
            getProducts().catch((e) => {
              console.error("❌ getProducts error:", e);
              return [];
            }),
            getKritisPackingVariants().catch((e) => {
              console.error("❌ getKritisPackingVariants error:", e);
              return [];
            }),
          ]);

        setStats(dashStats);
        setUnitsList(units);
        // setKritisPacking(kpVars);

        // -- NOTIFIKASI OTOMATIS BERDASARKAN HASIL QUERY --
        // Skenario 3: Bahan Baku Kritis
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

        // Skenario 4: Produk Kritis (Gudang Packing)
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

        // Skenario 5: WO Terlambat
        if (!sessionStorage.getItem("notified_wo_terlambat")) {
          const hariIni = new Date().toISOString().slice(0, 10);
          const woTerlambat = wos.filter(
            (w) => (w.status === "berjalan" || w.status === "tertunda") && w.tanggalTarget < hariIni
          );
          if (woTerlambat.length > 0) {
            fetch("/api/send-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sendToAll: true,
                title: "⏰ Peringatan Work Order",
                body: `Terdapat ${woTerlambat.length} Work Order yang melewati batas target!`,
                link: "/produksi/work-order",
              }),
            }).catch(console.error);
            sessionStorage.setItem("notified_wo_terlambat", "true");
          }
        }

        // Sum inventory value
        const totalVal = materials.reduce(
          (sum, m) => sum + m.stokAktual * m.harga,
          0
        );
        setNilaiPersediaan(totalVal);

        // Average efficiency
        const avgEff =
          Array.isArray(units) && units.length > 0
            ? Math.round(
              units.reduce((sum, u) => sum + Number(u?.efisiensi || 0), 0) /
              units.length
            )
            : 0;
        setEfisiensiProd(avgEff);

        // Map recent 5 WOs
        const mappedWos = wos.slice(0, 5).map((wo) => {
          const prod = prods.find((p) => p.id === wo.productId);
          return {
            id: wo.nomor || "",
            produk: prod ? prod.nama : "Produk Tidak Dikenal",
            target: wo.jumlahTarget,
            status: wo.status.charAt(0).toUpperCase() + wo.status.slice(1),
          };
        });
        setRecentWos(mappedWos);

        // Map top 5 materials
        const mappedMaterials = materials.slice(0, 5).map((m) => ({
          id: m.id || "",
          nama: m.nama,
          stok: m.stokAktual,
          stokMin: m.stokMin,
          satuan: m.satuan,
        }));
        setRecentMaterials(mappedMaterials);

        // Distribution by category
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
              const mCat = m.kategoriId.startsWith("cat-")
                ? m.kategoriId.replace("cat-", "")
                : m.kategoriId;
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
        console.error("Failed to load dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── BANNER NOTIFIKASI IPHONE / HP ─── */}
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
                Agar Anda menerima pemberitahuan Work Order baru langsung di layar perangkat ini.
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
      {/* Alert Kritis Gudang Packing */}
      {/* {kritisPacking.length > 0 && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Peringatan Stok Gudang Packing Di Bawah Batas Minimum!
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5 font-medium">
                Ada {kritisPacking.length} varian produk yang stoknya kritis di Gudang Packing. Mohon segera ditindaklanjuti.
              </p>
            </div>
          </div>
          
          <div className="mt-3 divide-y divide-red-200/50 border-t border-red-200/50">
            {kritisPacking.map((item) => {
              const cukupDiBesar = item.stokGudangBesar > 0;
              return (
                <div key={item.variantId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-red-900">{item.productName}</span>
                    <span className="mx-1.5 text-red-400">·</span>
                    <span className="font-medium text-red-800">
                      Warna: {item.warna} · Ukuran: {item.ukuran}
                    </span>
                    <div className="mt-0.5 text-[10px] text-red-600/95 font-medium">
                      Stok Packing: <span className="font-bold font-mono text-red-700">{item.stokGudangPacking} pcs</span> (min. {item.stokMin})
                      <span className="mx-1.5 text-red-300">|</span>
                      Stok Gudang Besar: <span className="font-bold font-mono text-emerald-700">{item.stokGudangBesar} pcs</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cukupDiBesar ? (
                      <button
                        onClick={() => {
                          setTransferTarget(item);
                          setTransferJumlah(Math.min(item.stokMin - item.stokGudangPacking, item.stokGudangBesar) > 0 ? Math.min(item.stokMin - item.stokGudangPacking, item.stokGudangBesar) : 1);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-100/50 px-2.5 py-1.5 font-medium text-red-700 transition-colors shadow-sm"
                      >
                        <Zap className="h-3 w-3" />
                        Transfer Stok
                      </button>
                    ) : (
                      <Link
                        href={`/produksi/work-order?productId=${item.productId}&variantId=${item.variantId}&jumlah=${item.stokMin * 3}`}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-2.5 py-1.5 font-medium text-white transition-colors shadow-sm"
                      >
                        <Package className="h-3 w-3" />
                        Buat Work Order
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div> */}
      {/* )} */}

      {/* Alert Kritis */}
      {/* {stats.stokKritis > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Bahan Baku Stok Kritis!
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
              Ada {stats.stokKritis} jenis bahan baku yang berada di bawah stok
              minimum. Segera lakukan pemesanan ulang.
            </p>
          </div>
          <Link
            href="/persediaan/bahan-baku"
            className="flex-shrink-0 text-xs font-medium text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            Lihat <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )} */}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Produksi"
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
              <p className="text-xs text-muted-foreground">
                Target vs Aktual (unit)
              </p>
            </div>
            <Link
              href="/produksi/work-order"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat Work Order <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="w-full">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Legend
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="target"
                  name="Target"
                  fill="#b3e0ff"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="aktual"
                  name="Aktual"
                  fill="#003247"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribusi Persediaan */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Distribusi Persediaan</h2>
            <p className="text-xs text-muted-foreground">
              Berdasarkan kategori bahan (nilai Rp)
            </p>
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `Rp ${value.toLocaleString("id-ID")}`
                  }
                />
                <Legend
                  iconSize={8}
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 10 }}
                />
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
            <Link
              href="/produksi/work-order"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
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
                  {recentWos.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        Tidak ada work order aktif
                      </td>
                    </tr>
                  ) : (
                    recentWos.map((wo) => (
                      <tr key={wo.id} className="text-xs hover:bg-muted/10">
                        <td className="py-2.5 font-mono text-muted-foreground">
                          {wo.id}
                        </td>
                        <td className="py-2.5 font-medium text-foreground">
                          {wo.produk}
                        </td>
                        <td className="py-2.5 text-right font-medium">
                          {wo.target}
                        </td>
                        <td className="py-2.5 text-center">
                          <StatusBadge status={wo.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stok Kritis */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Status Stok Bahan Baku</h2>
            <Link
              href="/persediaan/bahan-baku"
              className="text-xs text-[#003247] hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
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
                  {recentMaterials.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-6 text-xs text-muted-foreground"
                      >
                        Tidak ada bahan baku
                      </td>
                    </tr>
                  ) : (
                    recentMaterials.map((m) => (
                      <tr key={m.id} className="text-xs hover:bg-muted/10">
                        <td className="py-2.5 font-medium text-foreground">
                          {m.nama}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground">
                          {m.stok.toLocaleString("id-ID")} {m.satuan}
                        </td>
                        <td className="py-2.5 text-right">
                          <StokBadge stok={m.stok} stokMin={m.stokMin} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Status Mesin */}
      <DashboardUnitProduksiSummary />
      <DashboardTahapProduksiSummary />

      {/* Transfer Dialog */}
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
                    <span className="font-semibold text-right">
                      {transferTarget.productName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Varian:</span>
                    <span className="font-medium text-right">
                      {transferTarget.warna} · {transferTarget.ukuran}
                    </span>
                  </div>
                  <hr className="border-border my-1.5" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stok Gudang Besar:
                    </span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {transferTarget.stokGudangBesar} pcs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Stok Gudang Packing:
                    </span>
                    <span className="font-mono text-red-500">
                      {transferTarget.stokGudangPacking} pcs (min.{" "}
                      {transferTarget.stokMin})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-foreground">
                    Jumlah Transfer (pcs){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={transferTarget.stokGudangBesar}
                    value={transferJumlah}
                    onChange={(e) =>
                      setTransferJumlah(Math.max(1, Number(e.target.value)))
                    }
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
                  className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] disabled:opacity-60"
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
