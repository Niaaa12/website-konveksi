"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Building, Lock, Save, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // State Form Profil
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");

  // State Form Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUserId(user.uid);
      setEmail(user.email || "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setNama(data.nama || "");
          setJabatan(data.jabatan || "");
          setRole(data.role || "");
        }
      } catch (err) {
        console.error("Gagal mengambil data user:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await updateDoc(doc(db, "users", userId), {
        nama,
        jabatan,
      });
      setSuccessMessage("Profil berhasil diperbarui!");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Gagal memperbarui profil: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    setChangingPassword(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("User tidak ditemukan.");

      await updatePassword(user, newPassword);
      setPasswordSuccess("Kata sandi berhasil diubah!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setPasswordError("Gagal mengubah kata sandi: " + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-xs text-muted-foreground">
        Memuat pengaturan...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Pengaturan Akun & Sistem</h1>
        <p className="text-xs text-muted-foreground">
          Kelola informasi profil pribadi dan preferensi sistem Sodai Group.
        </p>
      </div>

      {/* 1. Profil Pengguna */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2.5 bg-muted/20">
          <User className="h-4 w-4 text-[#003247]" />
          <h3 className="text-sm font-semibold text-foreground">Profil Pengguna</h3>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Email (Tidak dapat diubah)
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Jabatan
              </label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                placeholder="Contoh: Kepala Tim Produksi"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Hak Akses (Role Sistem)
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-muted/30 text-xs font-semibold uppercase text-[#003247]">
                <Shield className="h-3.5 w-3.5" />
                {role}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#003247]/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Menyimpan..." : "Simpan Perubahan Profil"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Keamanan (Ubah Password) */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2.5 bg-muted/20">
          <Lock className="h-4 w-4 text-[#003247]" />
          <h3 className="text-sm font-semibold text-foreground">Keamanan & Kata Sandi</h3>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="flex items-center gap-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 border border-border"
            >
              <Lock className="h-3.5 w-3.5" />
              {changingPassword ? "Memproses..." : "Ubah Kata Sandi"}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Informasi Sistem Konveksi */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2.5 bg-muted/20">
          <Building className="h-4 w-4 text-[#003247]" />
          <h3 className="text-sm font-semibold text-foreground">Informasi Sistem</h3>
        </div>
        <div className="p-6 space-y-3 text-xs text-muted-foreground">
          <div className="flex justify-between border-b border-border/60 pb-2">
            <span className="font-medium text-foreground">Nama Badan Usaha</span>
            <span>Konveksi Sodai Group</span>
          </div>
          <div className="flex justify-between border-b border-border/60 pb-2">
            <span className="font-medium text-foreground">Sistem Informasi</span>
            <span>SIM Produksi & Persediaan Bahan Baku</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-foreground">Versi Aplikasi</span>
            <span>v1.0.0 (Production Ready)</span>
          </div>
        </div>
      </div>
    </div>
  );
}