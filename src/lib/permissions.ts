export const TOUTES_PERMISSIONS = [
  "corriger_factures",
  "exporter",
  "gerer_assurances",
  "gerer_depots",
  "encaisser_virements",
  "voir_finances",
  "voir_analyses",
  "gerer_utilisateurs",
  "gerer_depenses",
] as const;

export type Permission = (typeof TOUTES_PERMISSIONS)[number];

export const LABELS_PERMISSIONS: Record<Permission, string> = {
  corriger_factures: "Corriger des factures",
  exporter: "Exporter (Excel/CSV/Word)",
  gerer_assurances: "Gérer les assurances",
  gerer_depots: "Gérer les dépôts",
  encaisser_virements: "Encaisser les virements",
  voir_finances: "Voir Finances & Relances",
  voir_analyses: "Voir Analyses & Statistiques",
  gerer_utilisateurs: "Gérer les utilisateurs",
  gerer_depenses: "Gérer les dépenses",
};

export const ROLES = ["admin", "directeur", "comptable", "assistant", "caissier"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS_PAR_ROLE: Record<Role, Permission[]> = {
  admin: [...TOUTES_PERMISSIONS],
  directeur: [
    "voir_finances", "voir_analyses", "exporter", "gerer_depenses",
    "encaisser_virements", "gerer_depots", "corriger_factures", "gerer_assurances",
  ],
  comptable: [
    "voir_finances", "voir_analyses", "exporter", "gerer_depenses",
    "encaisser_virements", "gerer_depots", "corriger_factures", "gerer_assurances",
  ],
  assistant: ["voir_finances", "exporter", "gerer_depots", "gerer_depenses"],
  caissier: [],
};

export function parsePermissions(json?: string | null): Set<Permission> {
  if (!json) return new Set();
  try {
    const arr = JSON.parse(json) as string[];
    return new Set(arr.filter((p): p is Permission => (TOUTES_PERMISSIONS as readonly string[]).includes(p)));
  } catch {
    return new Set();
  }
}

export function hasPermission(role: string, permissions: Set<Permission>, perm: Permission): boolean {
  if (role === "admin") return true;
  return permissions.has(perm);
}
