"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Building2, Receipt, Package, Users, LogOut, HeartPulse,
  BarChart3, Send, ClipboardCheck, Landmark, ChevronRight, ChevronDown,
  ClipboardList, ArrowUpDown, Wallet, Menu, X,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type MenuGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: Item[];
  adminOnly?: boolean;
};

const MENUS: MenuGroup[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, href: "/dashboard" },
  {
    label: "Gestion financière", icon: Wallet,
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
  { label: "Dépenses", icon: Receipt, href: "/depenses" },
  {
    label: "Stock", icon: Package,
    children: [
      { href: "/stock?tab=etat", label: "État du stock", icon: ClipboardList },
      { href: "/stock?tab=produits", label: "Produits", icon: Package },
      { href: "/stock?tab=mouvements", label: "Mouvements (E/S)", icon: ArrowUpDown },
    ],
  },
  { label: "Gestion des utilisateurs", icon: Users, href: "/utilisateurs", adminOnly: true },
];

function isMenuActive(menu: MenuGroup, path: string): boolean {
  if (menu.href) return path === menu.href || path.startsWith(menu.href + "/");
  if (menu.children) return menu.children.some((c) => {
    const base = c.href.split("?")[0];
    return path === base || path.startsWith(base + "/");
  });
  return false;
}

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);

  // Ferme le drawer mobile à chaque navigation
  useEffect(() => { setMobileOpen(false); }, [path]);

  // Empêche le scroll body quand drawer ouvert
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const visibleMenus = MENUS.filter((m) => !m.adminOnly || userRole === "admin");

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2 px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-6 w-6" />
          <div>
            <div className="font-semibold">Gestion Clinique</div>
            <div className="text-xs opacity-70">Espace de gestion</div>
          </div>
        </div>
        <button
          className="md:hidden p-1 rounded hover:bg-white/10"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto md:overflow-visible">
        {visibleMenus.map((menu) => {
          const Icon = menu.icon;
          const active = isMenuActive(menu, path);

          if (!menu.children) {
            return (
              <Link
                key={menu.label}
                href={menu.href!}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                {menu.label}
              </Link>
            );
          }

          const isExpanded = expandedMobile === menu.label;
          return (
            <div key={menu.label} className="md:relative md:group">
              {/* Mobile: click to expand inline */}
              <button
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-white/15 font-medium" : "hover:bg-white/10"
                )}
                onClick={() => setExpandedMobile(isExpanded ? null : menu.label)}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{menu.label}</span>
                {/* Chevron down on mobile (accordion), chevron right on desktop (flyout) */}
                <ChevronDown className={cn("md:hidden h-4 w-4 opacity-60 transition-transform", isExpanded && "rotate-180")} />
                <ChevronRight className="hidden md:block h-3.5 w-3.5 opacity-60 md:group-hover:opacity-100 transition-transform md:group-hover:translate-x-0.5" />
              </button>

              {/* Mobile: accordion inline */}
              <div className={cn("md:hidden overflow-hidden transition-all", isExpanded ? "max-h-96 mt-1" : "max-h-0")}>
                <div className="pl-6 space-y-1">
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
                        <CIcon className="h-3.5 w-3.5" />
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: flyout au survol */}
              <div className="hidden md:group-hover:block md:absolute md:left-full md:top-0 md:pl-2 z-50">
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
    </>
  );

  return (
    <>
      {/* Barre mobile top avec hamburger — visible uniquement sous md */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 h-14 w-full flex items-center justify-between px-4 bg-primary text-primary-foreground shadow-md"
        style={{ WebkitBackfaceVisibility: "hidden" }}
      >
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5" />
          <span className="font-semibold text-sm">Gestion Clinique</span>
        </div>
        <button
          type="button"
          className="p-2 rounded hover:bg-white/10 -mr-2"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar : drawer mobile OU fixed desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-primary text-primary-foreground transition-transform duration-300 md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
