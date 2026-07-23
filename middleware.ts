import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Daftar path yang TIDAK perlu login
const PATH_PUBLIK = ["/login", "/lupa-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati path publik
  if (PATH_PUBLIK.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cek token session (disimpan di cookie saat login)
  const session = request.cookies.get("__session")?.value;
  if (!session) {
    // Belum login → paksa ke halaman login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname); // ingat halaman tujuan
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Terapkan middleware ke semua halaman kecuali aset statis
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
