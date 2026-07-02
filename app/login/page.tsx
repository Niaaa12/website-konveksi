"use client";

import { useAuth } from "@/context/AuthContext";
import { kirimResetPassword, loginWithEmail, UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LayoutDashboard, Loader2, Lock, Mail, Package, Scissors, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


const BRAND = "#004766";

type Mode = "login" | "reset";

const roles: {
  key: UserRole;
  label: string;
  sub: string;
  Icon: React.ComponentType<any>;
}[] = [
  { key: "admin", label: "Admin", sub: "Full akses", Icon: ShieldCheck },
  { key: "produksi", label: "Produksi", sub: "WO & mesin", Icon: Scissors },
  { key: "gudang", label: "Gudang", sub: "Persediaan", Icon: Package },
  {
    key: "manajer",
    label: "Manajer",
    sub: "Laporan & KPI",
    Icon: LayoutDashboard,
  },
];

const roleRedirect: Record<UserRole, string> = {
  admin: "/dashboard",
  manajer: "/dashboard",
  produksi: "/produksi/work-order",
  gudang: "/persediaan/bahan-baku",
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "err" | "ok";
    msg: string;
  } | null>(null);

  // // Jika sudah login, redirect langsung
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.replace(roleRedirect[user.role] ?? "/dashboard");
  //   }
  // }, [user, loading, router]);

  // ── Handler Login ───────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);

    if (!email.trim()) {
      setAlert({ type: "err", msg: "Email tidak boleh kosong." });
      return;
    }
    if (!password) {
      setAlert({ type: "err", msg: "Kata sandi tidak boleh kosong." });
      return;
    }

    setSubmitting(true);
    const result = await loginWithEmail(email.trim(), password);
    setSubmitting(false);

    if (result.success && result.user) {
      setAlert({
        type: "ok",
        msg: `Selamat datang, ${result.user.nama}! Mengalihkan...`,
      });

      // Set cookie __session agar middleware dapat memverifikasi sesi.
      // Jika "Ingat saya" dicentang, cookie bertahan 30 hari; jika tidak, session-only.
      const maxAge = remember ? 60 * 60 * 24 * 30 : undefined;
      document.cookie = [
        `__session=${result.user.uid}`,
        "path=/",
        "SameSite=Strict",
        maxAge ? `max-age=${maxAge}` : "",
      ]
        .filter(Boolean)
        .join("; ");

      setTimeout(() => {
        router.replace(roleRedirect[result.user!.role] ?? "/dashboard");
      }, 800);
    } else {
      setAlert({ type: "err", msg: result.error ?? "Login gagal." });
    }
  }

  // ── Handler Reset Password ──────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);

    if (!email.trim()) {
      setAlert({ type: "err", msg: "Masukkan email Anda terlebih dahulu." });
      return;
    }

    setSubmitting(true);
    const result = await kirimResetPassword(email.trim());
    setSubmitting(false);

    if (result.success) {
      setAlert({
        type: "ok",
        msg: "Link reset kata sandi telah dikirim ke email Anda.",
      });
    } else {
      setAlert({
        type: "err",
        msg: result.error ?? "Gagal mengirim email reset.",
      });
    }
  }

  // Tampilkan layar loading saat memeriksa sesi
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5EEE4]  flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-[42%_58%] rounded-2xl overflow-hidden border border-border shadow-xl">
        {/* ── PANEL KIRI ── */}
        <div
          className="hidden lg:flex flex-col gap-10 p-9 relative overflow-hidden"
          style={{ background: "#003247" }}
        >
          {/* Decorative glows */}
          <div
            className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-20"
            style={{ background: BRAND }}
          />
          <div
            className="absolute top-[-50px] left-[-50px] w-48 h-48 rounded-full opacity-10"
            style={{ background: "#3B7597" }}
          />

          {/* Decorative fabric pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.06]"
            viewBox="0 0 300 600"
            preserveAspectRatio="xMidYMid slice"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={`d${i}`}
                x1={-20}
                y1={i * 55}
                x2={320}
                y2={i * 55 + 340}
                stroke="#f5ece8"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <line
                key={`r${i}`}
                x1={320}
                y1={i * 55}
                x2={-20}
                y2={i * 55 + 340}
                stroke="#f5ece8"
                strokeWidth="0.5"
              />
            ))}
            <circle
              cx="150"
              cy="300"
              r="90"
              stroke="#e8a0b4"
              strokeWidth="0.5"
              fill="none"
            />
            <circle
              cx="150"
              cy="300"
              r="130"
              stroke="#e8a0b4"
              strokeWidth="0.5"
              fill="none"
              opacity="0.5"
            />
          </svg>

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
              style={{ background: BRAND }}
            >
              🧕
            </div>
            <div>
              <p
                className="text-[15px] font-medium"
                style={{
                  color: "#FFFFF0",
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                Sodai Group Konveksi
              </p>
              <p className="text-[11px]" style={{ color: "#C0E1D2" }}>
                Sistem Informasi Manajemen Konveksi
              </p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="relative z-10 space-y-4">
            <div
              className="inline-block text-[11px] px-3 py-1 rounded-full border"
              style={{
                background: "#16476A",
                borderColor: "#CFECF3",
                color: "#E5EEE4",
              }}
            >
              ✦ Sistem Manajemen Terpadu
            </div>
            <h1
              className="text-[26px] leading-snug font-medium"
              style={{
                color: "#FFFFF0",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Kelola produksi
              <br />
              dengan <em style={{ color: "#C0E1D2" }}>lebih cerdas</em>
            </h1>
            <p
              className="text-[12.5px] leading-relaxed max-w-[230px]"
              style={{ color: "#E5EEE4" }}
            >
              Platform manajemen produksi dan persediaan bahan baku konveksi
              hijab Sodai Group — dari work order hingga laporan.
            </p>
          </div>

          <p className="relative z-10 text-[10px]" style={{ color: "#C0E1D2" }}>
            © 2026 Sodai Group · Hak cipta dilindungi
          </p>
        </div>

        {/* ── PANEL KANAN ── */}
        <div className="bg-card flex flex-col justify-center p-8 lg:p-10 min-h-[700px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: BRAND }}
            >
              🧕
            </div>
            <div>
              <p className="text-sm font-medium">Sodai Group Konveksi</p>
              <p className="text-xs text-muted-foreground">SIM Konveksi</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-1">
            {mode === "login" ? "Selamat datang kembali" : "Reset kata sandi"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login"
              ? "Masuk untuk mengakses dashboard produksi"
              : "Masukkan email Anda, kami akan kirim link reset"}
          </p>

          {/* Role selector — hanya saat login */}
          {mode === "login" && (
            <div className="mb-6">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Masuk sebagai
              </p>
              <div className="grid grid-cols-4 gap-2">
                {roles.map(({ key, label, sub, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={submitting}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    style={{
                      borderColor: BRAND,
                      background: "#E5EEE4",
                      color: BRAND,
                    }}
                    // Semua role ditampilkan tapi validasi dilakukan di server/Firestore
                    onClick={() => {
                      
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-medium leading-tight">
                      {label}
                    </span>
                    <span className="text-[9px] opacity-70">{sub}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Role ditentukan otomatis berdasarkan akun Anda di sistem.
              </p>
            </div>
          )}

          {/* Alert */}
          {alert && (
            <div
              className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl text-sm mb-4",
                alert.type === "ok"
                  ? "bg-blue-50 border border-blue-200 text-white-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-white-300"
                  : "bg-red-100 border border-red-300 text-red-1000 dark:text-red-500"
              )}
            >
              {alert.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{alert.msg}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={mode === "login" ? handleLogin : handleReset}
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex-shrink-0"
                  style={{ color: BRAND, opacity: 0.7 }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sodaigroup.id"
                  autoComplete="email"
                  disabled={submitting}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2"
                  style={
                    { "--tw-ring-color": `${BRAND}25` } as React.CSSProperties
                  }
                  onFocus={(e) => (e.target.style.borderColor = BRAND)}
                  onBlur={(e) => (e.target.style.borderColor = "")}
                />
              </div>
            </div>

            {/* Password — hanya saat login */}
            {mode === "login" && (
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  Kata sandi
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 flex-shrink-0"
                    style={{ color: BRAND, opacity: 0.7 }}
                  />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={submitting}
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    onFocus={(e) => (e.target.style.borderColor = BRAND)}
                    onBlur={(e) => (e.target.style.borderColor = "")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    aria-label={
                      showPass
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember + Forgot — hanya saat login */}
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: BRAND }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Ingat saya
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setAlert(null);
                  }}
                  className="text-xs font-medium hover:opacity-75 transition-opacity"
                  style={{ color: BRAND }}
                >
                  Lupa kata sandi?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: BRAND }}
              onMouseEnter={(e) =>
                !submitting &&
                ((e.target as HTMLElement).style.background = "#1B3C53")
              }
              onMouseLeave={(e) =>
                !submitting &&
                ((e.target as HTMLElement).style.background = BRAND)
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...
                </>
              ) : mode === "login" ? (
                <>
                  <span>Masuk ke dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Kirim link reset</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Back to login — saat mode reset */}
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setAlert(null);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Kembali ke halaman login
              </button>
            )}
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Butuh bantuan?{" "}
            <a
              href="mailto:it@sodaigroup.id"
              className="font-medium hover:opacity-75"
              style={{ color: BRAND }}
            >
              Hubungi IT Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}