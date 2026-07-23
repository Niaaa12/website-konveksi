"use client";

import {
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarStokKritisSection } from "@/components/alert/SidebarStokKritisSection";
import { HALAMAN_AKSES, type UserRole } from "@/lib/auth";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Produksi",
    icon: Factory,
    children: [
      {
        label: "Work Order",
        href: "/produksi/work-order",
        icon: ClipboardList,
      },
      { label: "Jadwal Produksi", href: "/produksi/jadwal", icon: Calendar },
      { label: "Unit Produksi", href: "/produksi/unitproduksi", icon: Factory },
    ],
  },
  {
    label: "Persediaan",
    icon: Package,
    children: [
      { label: "Bahan Baku", href: "/persediaan/bahan-baku", icon: Boxes },
      { label: "Produk Jadi", href: "/persediaan/produk-jadi", icon: Package },
      { label: "Transfer Gudang", href: "/persediaan/transfer", icon: Truck },
      {
        label: "Pengeluaran Produk",
        href: "/persediaan/pengeluaran",
        icon: Package,
      },
    ],
  },
  { label: "Progress Saya", href: "/progress", icon: ClipboardCheck },
  {
    label: "Katalog Produk",
    href: "/katalogproduk",
    icon: BookOpen,
  },
  {
    label: "Laporan",
    href: "/laporan",
    icon: BarChart3,
  },
  {
    label: "Pengguna",
    href: "/pengguna",
    icon: Users,
  },
  {
    label: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function getInitial(nama: string) {
  return nama
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const [userData, setUserData] = useState<{
    nama: string;
    email: string;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) return;

      const data = snap.data();

      setUserRole(data.role as UserRole);

      setUserData({
        nama: data.nama,
        email: data.email,
        role: data.role,
      });
    });

    return () => unsub();
  }, []);
  const menuTersedia = menuItems.filter((item) => {
    if (item.children) {
      item.children = item.children.filter((child) => {
        const role = HALAMAN_AKSES[child.href];
        return !role || role.includes(userRole!);
      });

      return item.children.length > 0;
    }

    const role = HALAMAN_AKSES[item.href];
    return !role || role.includes(userRole!);
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-30 h-full w-64 flex-col bg-[#003247] text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 lg:flex",
          open ? "flex translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Factory className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-accent-foreground">
                Sodai Group
              </p>
              <p className="text-[10px] text-sidebar-foreground/60">
                SIM Produksi & Persediaan Bahan Baku
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {menuTersedia.map((item) =>
              item.children ? (
                <NavGroup key={item.label} item={item} pathname={pathname} />
              ) : (
                <NavItem
                  key={item.href}
                  href={item.href!}
                  icon={item.icon}
                  label={item.label}
                  active={
                    item.href !== "/" &&
                    (pathname === item.href ||
                      pathname.startsWith(item.href + "/"))
                  }
                  onClick={onClose}
                />
              )
            )}
          </ul>
        </nav>

        {/* Notifikasi kritis */}
        <SidebarStokKritisSection />

        {/* User */}
        <div className="border-t border-sidebar-border p-2.5">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {userData ? getInitial(userData.nama) : "--"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {userData?.nama ?? "Loading..."}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {userData?.email}
              </p>
            </div>

            <ChevronRight className="h-3 w-3 text-sidebar-foreground/40" />
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-sidebar-primary/20 text-sidebar-primary font-medium"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function NavGroup({
  item,
  pathname,
}: {
  item: (typeof menuItems)[0];
  pathname: string;
}) {
  const Icon = item.icon;
  const isActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/")
  );

  return (
    <li>
      <details open={isActive} className="group">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        </summary>
        <ul className="mt-1 ml-3 space-y-1 border-l border-sidebar-border pl-3">
          {item.children?.map((child) => (
            <NavItem
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              active={pathname === child.href}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}
