"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ChevronRight,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Package,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarStokKritisSection } from "@/components/alert/SidebarStokKritisSection";

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
      { label: "Jadwal Produksi", href: "/produksi/jadwal", icon: Factory },
    ],
  },
  {
    label: "Persediaan",
    icon: Package,
    children: [
      { label: "Bahan Baku", href: "/persediaan/bahan-baku", icon: Boxes },
      { label: "Penerimaan", href: "/persediaan/penerimaan", icon: Truck },
      { label: "Pengeluaran", href: "/persediaan/pengeluaran", icon: Package },
    ],
  },
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

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
            {menuItems.map((item) =>
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
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-white">
              AS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                Admin Sistem
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                admin@sodaigroup.id
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40" />
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
