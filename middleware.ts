import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati route publik dan aset statis
  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  // Cek session cookie yang di-set setelah login berhasil
  const session = request.cookies.get("__session")?.value;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    // Simpan halaman tujuan agar bisa redirect balik setelah login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan middleware di semua route kecuali aset statis
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};