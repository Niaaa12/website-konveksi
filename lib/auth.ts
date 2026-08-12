import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  AuthError,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

// ── Tipe Data ────────────────────────────────────────────────────────

export type UserRole = "admin" | "kepalaTimProduksi" | "kepalaGudang" | "manajer" | "picproduksi";

// Peta halaman → role yang boleh akses
// Dipakai oleh middleware.ts dan AuthGuard
export const HALAMAN_AKSES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "manajer", "kepalaTimProduksi", "kepalaGudang", "picproduksi"],
  "/produksi/work-order": ["admin", "kepalaTimProduksi"],
  "/produksi/jadwal": ["admin", "kepalaTimProduksi"],
  "/produksi/unitproduksi": ["admin", "kepalaTimProduksi"],
  "/persediaan/bahan-baku": ["admin", "kepalaGudang"],
  "/persediaan/produk-jadi": ["admin", "kepalaGudang"],
  "/persediaan/transfer": ["admin", "kepalaGudang"],
  "/persediaan/pengeluaran": ["admin", "kepalaGudang"],
  "/persediaan/penerimaan": ["admin", "kepalaGudang"],
  "/progress": ["kepalaTimProduksi", "picproduksi"],
  "/katalogproduk": ["admin", "kepalaTimProduksi", "kepalaGudang"],
  "/laporan": ["admin", "manajer", "kepalaTimProduksi", "kepalaGudang"],
  "/pengguna": ["admin"],
  "/pengaturan": ["admin", "manajer", "kepalaTimProduksi",
    "kepalaGudang",
    "picproduksi"],
};

// Halaman awal setelah login per role
export const HALAMAN_AWAL: Record<UserRole, string> = {
  admin: "/dashboard",
  manajer: "/dashboard",
  kepalaTimProduksi: "/produksi/work-order",
  picproduksi: "/progress",     // langsung ke progress, bukan dashboard
  kepalaGudang: "/dashboard",
};

export interface UserProfile {
  uid: string;
  email: string;
  nama: string;
  role: UserRole;
  jabatan: string;
  avatar?: string;
  aktif: boolean;
  createdAt: Date | null;
  lastLogin: Date | null;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// ── Pesan Error Indonesia ────────────────────────────────────────────

function pesanError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "Akun dengan email ini tidak ditemukan.",
    "auth/wrong-password": "Kata sandi salah. Silakan coba lagi.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-disabled": "Akun ini telah dinonaktifkan. Hubungi admin.",
    "auth/too-many-requests":
      "Terlalu banyak percobaan. Coba beberapa menit lagi.",
    "auth/network-request-failed":
      "Gagal terhubung ke jaringan. Periksa koneksi internet.",
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/operation-not-allowed": "Metode login ini tidak diizinkan.",
  };
  return map[code] ?? "Terjadi kesalahan. Silakan coba lagi.";
}

// ── Login ─────────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);

    if (!profile) {
      await signOut(auth);
      return {
        success: false,
        error: "Profil pengguna tidak ditemukan. Hubungi admin.",
      };
    }

    if (!profile.aktif) {
      await signOut(auth);
      return {
        success: false,
        error: "Akun Anda telah dinonaktifkan. Hubungi admin.",
      };
    }

    // Catat waktu login terakhir
    await setDoc(
      doc(db, "users", credential.user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );

    return { success: true, user: profile };
  } catch (err) {
    const authErr = err as AuthError;
    return { success: false, error: pesanError(authErr.code) };
  }
}

// ── Login dengan Google ──────────────────────────────────────────────
export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    // Cek apakah user sudah punya profil di Firestore
    let profile = await getUserProfile(user.uid);

    // Jika ini adalah pertama kalinya login pakai Google (belum ada profil)
    if (!profile) {
      // Kita buatkan profil otomatis. (Anda bisa ubah default role-nya di sini)
      const defaultRole: UserRole = "picproduksi";
      await createUserProfile(
        user.uid,
        user.email ?? "",
        user.displayName ?? "Pengguna Google",
        defaultRole,
        "Staf" // Jabatan default
      );
      // Ambil kembali profil yang baru dibuat
      profile = await getUserProfile(user.uid);
    }

    if (!profile) {
      await signOut(auth);
      return { success: false, error: "Gagal memuat profil pengguna." };
    }

    if (!profile.aktif) {
      await signOut(auth);
      return { success: false, error: "Akun Anda telah dinonaktifkan. Hubungi admin." };
    }

    // Catat waktu login terakhir
    await setDoc(
      doc(db, "users", user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );

    return { success: true, user: profile };
  } catch (err) {
    const authErr = err as AuthError;
    return { success: false, error: pesanError(authErr.code) };
  }
}

// ── Logout ────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await signOut(auth);
}

// ── Reset Password ────────────────────────────────────────────────────

export async function kirimResetPassword(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });
    return { success: true };
  } catch (err) {
    const authErr = err as AuthError;
    return { success: false, error: pesanError(authErr.code) };
  }
}

// ── Profil Pengguna dari Firestore ────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      uid,
      email: data.email ?? "",
      nama: data.nama ?? "",
      role: data.role ?? "produksi",
      jabatan: data.jabatan ?? "",
      avatar: data.avatar ?? undefined,
      aktif: data.aktif ?? true,
      createdAt: data.createdAt?.toDate() ?? null,
      lastLogin: data.lastLogin?.toDate() ?? null,
    };
  } catch {
    return null;
  }
}

// ── Buat Pengguna Baru di Firestore (dipanggil setelah create di Admin SDK) ──

export async function createUserProfile(
  uid: string,
  email: string,
  nama: string,
  role: UserRole,
  jabatan: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    email,
    nama,
    role,
    jabatan,
    aktif: true,
    createdAt: serverTimestamp(),
    lastLogin: null,
  });
}

// ── Observer Auth State ───────────────────────────────────────────────

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
