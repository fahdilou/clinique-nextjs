import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { createClient } from "./supabase/server";
import { parsePermissions, type Permission } from "./permissions";

export type SessionUser = {
  id: number;
  email: string;
  nom: string;
  role: string;
  permissions: Set<Permission>;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const u = await prisma.utilisateur.findUnique({ where: { email: user.email } });
  if (!u || u.actif === 0) return null;

  return {
    id: u.id,
    email: u.email,
    nom: u.nom,
    role: u.role,
    permissions: parsePermissions(u.permissions),
  };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin" && !u.permissions.has(perm)) redirect("/dashboard");
  return u;
}
