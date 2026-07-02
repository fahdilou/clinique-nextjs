"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, Building2, Receipt, Package, Users, LogOut, HeartPulse,
  BarChart3, Send, ClipboardCheck, Landmark,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/situation", label: "Situation Globale", icon: BarChart3 },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/point-global", label: "Point Global", icon: ClipboardCheck },
  { href: "/encaissement", label: "Encaissement", icon: Landmark },
  { href: "/relances", label: "Relances", icon: Send },
  { href: "/analyses", label: "Analyses", icon: BarChart3 },
  { href: "/assurances", label: "Assurances", icon: Building2 },
  { href: "/depenses", label: "Dépenses", icon: Receipt },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/utilisateurs", label: "Utilisateurs", icon: Users, adminOnly: true },
];

export function Sidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <HeartPulse className="h-6 w-6" />
        <div>
          <div className="font-semibold">Gestion Clinique</div>
          <div className="text-xs opacity-70">Espace de gestion</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.filter((n) => !n.adminOnly || userRole === "admin").map((n) => {
          const Icon = n.icon;
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-white/15 font-medium" : "hover:bg-white/10"
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
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
