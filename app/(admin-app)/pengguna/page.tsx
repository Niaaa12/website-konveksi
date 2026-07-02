"use client";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { app as firebaseApp, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Loader2,
  X,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  UserCircle2,
  Shield,
  ShieldCheck,
  Package,
  Warehouse,
  KeyRound,
  Mail,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE
// ─────────────────────────────────────────────────────────────────────────────

type UserRole = "admin" | "manajer" | "produksi" | "gudang";

interface AppUser {
  id: string; // = Firebase Auth UID
  email: string;
  nama: string;
  role: UserRole;
  jabatan: string;
  aktif: boolean;
  createdAt?: any;
  lastLogin?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURASI ROLE
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string;
    color: string;
    bg: string;
    icon: React.ElementType;
  }
> = {
  admin: {
    label: "Admin",
    color: "text-red-700",
    bg: "bg-red-100 dark:bg-red-900/30 dark:text-red-400",
    icon: ShieldCheck,
  },
  manajer: {
    label: "Manajer Konveksi",
    color: "text-violet-700",
    bg: "bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400",
    icon: Shield,
  },
  produksi: {
    label: "Kepala Tim Produksi",
    color: "text-blue-700",
    bg: "bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Package,
  },
  gudang: {
    label: "Kepala Gudang",
    color: "text-amber-700",
    bg: "bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Warehouse,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), orderBy("nama")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser));
}

async function updateUser(
  uid: string,
  data: Partial<Omit<AppUser, "id" | "email">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

async function deactivateUser(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    aktif: false,
    updatedAt: serverTimestamp(),
  });
}

async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE KOMPONEN
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        cfg.bg
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function AktifBadge({ aktif }: { aktif: boolean }) {
  return aktif ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      <span className="h-1 w-1 rounded-full bg-emerald-500" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800">
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      Nonaktif
    </span>
  );
}

function getInitials(nama: string) {
  return nama
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getAvatarBg(role: UserRole) {
  const map: Record<UserRole, string> = {
    admin: "bg-red-500",
    manajer: "bg-violet-500",
    produksi: "bg-blue-500",
    gudang: "bg-amber-500",
  };
  return map[role];
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DETAIL PENGGUNA
// ─────────────────────────────────────────────────────────────────────────────

function DetailModal({
  user,
  onClose,
  onEdit,
}: {
  user: AppUser;
  onClose: () => void;
  onEdit: () => void;
}) {
  const cfg = ROLE_CONFIG[user.role];
  const Icon = cfg.icon;

  function formatDate(ts: any) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-5 px-6 bg-gradient-to-b from-[#003247]/5 to-transparent border-b border-border">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg border border-border p-1.5 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mb-3",
              getAvatarBg(user.role)
            )}
          >
            {getInitials(user.nama)}
          </div>
          <h2 className="text-base font-semibold">{user.nama}</h2>
          <p className="text-xs text-muted-foreground mb-2">{user.jabatan}</p>
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} />
            <AktifBadge aktif={user.aktif} />
          </div>
        </div>

        {/* Info */}
        <div className="px-6 py-5 space-y-3">
          {[
            { label: "Email", value: user.email, icon: Mail },
            { label: "Role", value: cfg.label, icon: Icon },
            { label: "Jabatan", value: user.jabatan, icon: UserCircle2 },
            {
              label: "Terdaftar",
              value: formatDate(user.createdAt),
              icon: Check,
            },
            {
              label: "Login Terakhir",
              value: formatDate(user.lastLogin),
              icon: RefreshCw,
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 flex-shrink-0">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-xs font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#003247] py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Pengguna
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FORM TAMBAH / EDIT
// ─────────────────────────────────────────────────────────────────────────────

interface FormData {
  nama: string;
  email: string;
  jabatan: string;
  role: UserRole;
  aktif: boolean;
  password: string;
}

const EMPTY_FORM: FormData = {
  nama: "",
  email: "",
  jabatan: "",
  role: "produksi",
  aktif: true,
  password: "",
};

function FormModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: AppUser;
  onClose: () => void;
  onSave: (data: FormData, uid?: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<FormData>(
    initial
      ? {
        nama: initial.nama,
        email: initial.email,
        jabatan: initial.jabatan,
        role: initial.role,
        aktif: initial.aktif,
        password: "",
      }
      : { ...EMPTY_FORM }
  );
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof FormData, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama.trim() || !form.email.trim() || !form.jabatan.trim()) {
      setError("Nama, email, dan jabatan wajib diisi.");
      return;
    }
    if (!isEdit && form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form, initial?.id);
      onClose();
    } catch (err: any) {
      const msg: Record<string, string> = {
        "auth/email-already-in-use": "Email sudah digunakan akun lain.",
        "auth/weak-password": "Password terlalu lemah.",
        "auth/invalid-email": "Format email tidak valid.",
      };
      setError(msg[err.code] ?? err.message ?? "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border p-1.5 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[80vh]">
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{" "}
                {error}
              </div>
            )}

            {/* Avatar preview */}
            <div className="flex justify-center">
              <div
                className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold",
                  getAvatarBg(form.role)
                )}
              >
                {form.nama ? (
                  getInitials(form.nama)
                ) : (
                  <UserCircle2 className="h-7 w-7 opacity-60" />
                )}
              </div>
            </div>

            {/* Nama */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Ratna Cahyani"
                className={inputClass}
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                disabled={isEdit}
                placeholder="nama@sodaigroup.id"
                className={cn(
                  inputClass,
                  isEdit && "opacity-50 cursor-not-allowed"
                )}
              />
              {isEdit && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Email tidak bisa diubah
                </p>
              )}
            </div>

            {/* Password (hanya saat tambah) */}
            {!isEdit && (
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="Min. 8 karakter"
                    className={cn(inputClass, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

            {/* Jabatan */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Jabatan <span className="text-red-500">*</span>
              </label>
              <input
                value={form.jabatan}
                onChange={(e) => set("jabatan", e.target.value)}
                placeholder="Kepala Tim Jahit"
                className={inputClass}
              />
            </div>

            {/* Role */}
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                Role / Hak Akses <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(ROLE_CONFIG) as [
                    UserRole,
                    (typeof ROLE_CONFIG)[UserRole]
                  ][]
                ).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set("role", key)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                        form.role === key
                          ? "border-[#003247] bg-[#003247]/5 ring-1 ring-[#003247]/30"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          form.role === key
                            ? "text-[#003247]"
                            : "text-muted-foreground"
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "text-xs font-medium capitalize",
                            form.role === key ? "text-[#003247]" : ""
                          )}
                        >
                          {key}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {cfg.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status aktif (hanya saat edit) */}
            {isEdit && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(e) => set("aktif", e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "h-5 w-9 rounded-full transition-colors",
                      form.aktif ? "bg-[#003247]" : "bg-muted"
                    )}
                  />
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                      form.aktif ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </div>
                <span className="text-sm font-medium">
                  {form.aktif ? "Akun aktif" : "Akun nonaktif"}
                </span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isEdit ? "Simpan Perubahan" : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN UTAMA
// ─────────────────────────────────────────────────────────────────────────────

export default function PenggunaPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "">("");
  const [filterAktif, setFilterAktif] = useState<
    "semua" | "aktif" | "nonaktif"
  >("semua");

  // Modal state
  const [detail, setDetail] = useState<AppUser | null>(null);
  const [editUser, setEditUser] = useState<AppUser | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchUsers().catch((e) => {
        console.error("users error:", e);
        return [];
      });
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Tutup dropdown saat klik luar
  useEffect(() => {
    function close() {
      setOpenMenu(null);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // Simpan pengguna (tambah / edit)
  async function handleSave(data: FormData, uid?: string) {
    if (uid) {
      // Edit: update Firestore saja (tidak menyentuh Firebase Auth)
      await updateUser(uid, {
        nama: data.nama,
        jabatan: data.jabatan,
        role: data.role,
        aktif: data.aktif,
      });
    } else {
      // ─── PENTING ─────────────────────────────────────────────────────────
      // createUserWithEmailAndPassword pada primary Auth instance otomatis
      // mengganti sesi admin dengan user baru (onAuthStateChanged terpicu).
      // Solusi: gunakan secondary Firebase App instance yang terpisah,
      // sehingga primary Auth (yang dibaca AuthContext & Topbar) tidak berubah.
      // ─────────────────────────────────────────────────────────────────────
      const secondaryApp = initializeApp(
        firebaseApp.options,
        `secondary-${Date.now()}`
      );
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          data.email,
          data.password
        );

        // Simpan profil ke Firestore menggunakan db dari primary app
        await setDoc(doc(db, "users", cred.user.uid), {
          email: data.email,
          nama: data.nama,
          role: data.role,
          jabatan: data.jabatan,
          aktif: true,
          lastLogin: null,
          createdAt: serverTimestamp(),
        });
      } finally {
        // Bersihkan: sign-out dari secondary app dan hapus instance-nya
        await signOut(secondaryAuth).catch(() => {});
        await deleteApp(secondaryApp).catch(() => {});
      }
    }
    await loadUsers();
  }

  // Reset password via email
  async function handleResetPassword() {
    if (!resetTarget) return;
    const auth = getAuth();
    await sendPasswordResetEmail(auth, resetTarget.email);
    setResetSent(true);
  }

  // Hapus pengguna (Firestore doc saja — Auth hanya bisa dihapus via Admin SDK)
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserDoc(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
    } finally {
      setDeleting(false);
    }
  }

  // Filter
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.nama.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.jabatan.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchAktif =
      filterAktif === "semua" || (filterAktif === "aktif" ? u.aktif : !u.aktif);
    return matchSearch && matchRole && matchAktif;
  });

  // Stats
  const stats = {
    total: users.length,
    aktif: users.filter((u) => u.aktif).length,
    admin: users.filter((u) => u.role === "admin").length,
    manajer: users.filter((u) => u.role === "manajer").length,
    produksi: users.filter((u) => u.role === "produksi").length,
    gudang: users.filter((u) => u.role === "gudang").length,
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">
            Memuat data pengguna...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Pengguna",
            value: stats.total,
            icon: UserCircle2,
            color: "bg-slate-100 text-slate-700",
          },
          {
            label: "Akun Aktif",
            value: stats.aktif,
            icon: Check,
            color: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Admin & Manajer",
            value: stats.admin + stats.manajer,
            icon: ShieldCheck,
            color: "bg-red-100 text-red-700",
          },
          {
            label: "Staf Lapangan",
            value: stats.produksi + stats.gudang,
            icon: Package,
            color: "bg-blue-100 text-blue-700",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <span className={cn("inline-flex rounded-lg p-1.5 mb-2", s.color)}>
              <s.icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau jabatan..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-9 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003247]/30"
        >
          <option value="">Semua Role</option>
          {(Object.entries(ROLE_CONFIG) as [UserRole, any][]).map(
            ([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            )
          )}
        </select>

        <div className="flex rounded-xl border border-border bg-card overflow-hidden text-sm">
          {(["semua", "aktif", "nonaktif"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterAktif(opt)}
              className={cn(
                "px-4 py-2.5 capitalize transition-colors",
                filterAktif === opt
                  ? "bg-[#003247] text-white"
                  : "hover:bg-muted/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => setEditUser("new")}
            className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-[#003247] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#004a6e] transition-colors"
          >
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </button>
        </div>
      </div>

      {/* ── Tabel Pengguna ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Menampilkan{" "}
            <span className="font-medium text-foreground">
              {filtered.length}
            </span>{" "}
            dari {users.length} pengguna
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <UserCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Tidak ada pengguna ditemukan
            </p>
            {!search && !filterRole && filterAktif === "semua" && (
              <button
                onClick={() => setEditUser("new")}
                className="mt-2 text-xs text-[#003247] hover:underline"
              >
                + Tambah pengguna pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <th className="px-5 py-3">Pengguna</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 hidden md:table-cell">Jabatan</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Email</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Avatar + Nama */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                            getAvatarBg(user.role)
                          )}
                        >
                          {getInitials(user.nama)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {user.nama}
                          </p>
                          <p className="text-[10px] text-muted-foreground lg:hidden truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                      {user.jabatan}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-5 py-3.5">
                      <AktifBadge aktif={user.aktif} />
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetail(user)}
                          className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                          title="Lihat detail"
                        >
                          <UserCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditUser(user)}
                          className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {/* More menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenu(
                                openMenu === user.id ? null : user.id
                              );
                            }}
                            className="rounded-lg border border-border bg-background p-1.5 hover:bg-muted/60 transition-colors"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                          {openMenu === user.id && (
                            <div
                              className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setResetTarget(user);
                                  setResetSent(false);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted/60 transition-colors"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                                Reset Password
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteTarget(user);
                                  setOpenMenu(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                                Pengguna
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Detail ── */}
      {detail && !editUser && (
        <DetailModal
          user={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditUser(detail);
            setDetail(null);
          }}
        />
      )}

      {/* ── Modal Form ── */}
      {editUser && (
        <FormModal
          initial={editUser === "new" ? undefined : editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}

      {/* ── Modal Reset Password ── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <KeyRound className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Reset Password</h3>
                <p className="text-xs text-muted-foreground">
                  Email reset akan dikirim ke pengguna
                </p>
              </div>
            </div>
            {resetSent ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3 text-xs text-emerald-700 mb-4">
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
                Email reset password berhasil dikirim ke{" "}
                <strong>{resetTarget.email}</strong>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-5">
                Link reset password akan dikirim ke{" "}
                <strong className="text-foreground">{resetTarget.email}</strong>
                . Pengguna harus mengklik link tersebut untuk mengatur password
                baru.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResetTarget(null);
                  setResetSent(false);
                }}
                className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
              >
                {resetSent ? "Tutup" : "Batal"}
              </button>
              {!resetSent && (
                <button
                  onClick={handleResetPassword}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Mail className="h-3.5 w-3.5" /> Kirim Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Hapus Pengguna?</h3>
                <p className="text-xs text-muted-foreground">
                  Data Firestore akan dihapus permanen
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-700 mb-4">
              <strong>Catatan:</strong> Akun Firebase Auth pengguna ini harus
              dihapus manual melalui Firebase Console → Authentication.
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Pengguna{" "}
              <strong className="text-foreground">{deleteTarget.nama}</strong> (
              {deleteTarget.email}) akan dihapus dari sistem.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{" "}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
