"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Building2, Receipt, Package, Users, LogOut, HeartPulse,
  BarChart3, Send, ClipboardCheck, Landmark, ChevronRight,
  ClipboardList, ArrowUpDown, Wallet, Upload,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

type MenuGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string; // si présent, cliquable direct (sans sous-menu)
  children?: Item[];
  adminOnly?: boolean;
};

const MENUS: MenuGroup[] = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Gestion financière",
    icon: Wallet,
    children: [
      { href: "/situation", label: "Situation globale", icon: BarChart3 },
      { href: "/factures", label: "Factures", icon: FileText },
      { href: "/point-global", label: "Point global (dépôts)", icon: ClipboardCheck },
      { href: "/encaissement", label: "Encaissement", icon: Landmark },
      { href: "/relances", label: "Relances", icon: Send },
      { href: "/analyses", label: "Analyses", icon: BarChart3 },
      { href: "/assurances", label: "Assurances", icon: Building2 },
    ],
  },
  {
    label: "Dépenses",
    icon: Receipt,
    href: "/depenses",
  },
  {
    label: "Stock",
    icon: Package,
    children: [
      { href: "/stock?tab=etat", label: "État du stock", icon: ClipboardList },
      { href: "/stock?tab=produits", label: "Produits", icon: Package },
      { href: "/stock?tab=mouvements", label: "Mouvements (E/S)", icon: ArrowUpDown },
    ],
  },
  {
    label: "Gestion des utilisateurs",
    icon: Users,
    href: "/utilisateurs",
    adminOnly: true,
  },
];

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const path = usePathname();

  const isMenuActive = (menu: MenuGroup): boolean => {
    if (menu.href) return path === menu.href || path.startsWith(menu.href + "/");
    if (menu.children) return menu.children.some((c) => {
      const base = c.href.split("?")[0];
      return path === base || path.startsWith(base + "/");
    });
    return false;
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <HeartPulse className="h-6 w-6" />
        <div>
          <div className="font-semibold">Gestion Clinique</div>
          <div className="text-xs opacity-70">Espace de gestion</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-visible">
        {MENUS.filter((m) => !m.adminOnly || userRole === "admin").map((menu) => {
          const Icon = menu.icon;
          const active = isMenuActive(menu);

          // Menu simple (pas de sous-menu)
          if (!menu.children) {
            return (
              <Link
                key={menu.label}
                href={menu.href!}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                {menu.label}
              </Link>
            );
          }

          // Menu avec sous-menu (hover flyout)
          return (
            <div key={menu.label} className="relative group">
              <button
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{menu.label}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Flyout au survol */}
              <div className="absolute left-full top-0 ml-0 pl-2 hidden group-hover:block z-50">
                <div className="w-64 rounded-md bg-primary border border-white/10 shadow-xl overflow-hidden">
                  <div className="px-4 py-2 text-xs uppercase tracking-wider opacity-70 border-b border-white/10">
                    {menu.label}
                  </div>
                  <div className="p-1">
                    {menu.children.map((c) => {
                      const CIcon = c.icon;
                      const cBase = c.href.split("?")[0];
                      const cActive = path === cBase || path.startsWith(cBase + "/");
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            cActive ? "bg-white/20 font-medium" : "hover:bg-white/10"
                          )}
                        >
                          <CIcon className="h-4 w-4" />
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-2">
        <div className="text-sm">
          <div className="font-medium truncate">{userName}</div>
          <div className="text-xs opacity-70 capitalize">{userRole}</div>
        </div>
        <form action={signOut}>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-white/10">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
