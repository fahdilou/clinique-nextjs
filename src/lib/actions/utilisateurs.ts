"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PERMISSIONS_PAR_ROLE, ROLES, TOUTES_PERMISSIONS, type Role, type Permission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Réservé aux administrateurs");
  return u;
}

export async function createUtilisateur(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nom = String(formData.get("nom") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "caissier") as Role;
  if (!email || !nom || !password) throw new Error("Champs requis manquants");

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error && !error.message.includes("already")) throw new Error(error.message);

  const permissions = JSON.stringify(PERMISSIONS_PAR_ROLE[role] ?? []);
  await prisma.utilisateur.upsert({
    where: { email },
    update: { nom, role, permissions, actif: 1 },
    create: { email, nom, role, permissions, actif: 1, mot_de_passe: "supabase-auth" },
  });
  revalidatePath("/utilisateurs");
}

export async function updateUtilisateur(id: number, formData: FormData) {
  await requireAdmin();
  const nom = String(formData.get("nom") || "").trim();
  const role = String(formData.get("role") || "caissier");
  const actif = formData.get("actif") === "on" ? 1 : 0;
  const perms = formData.getAll("permissions").map(String).filter((p) => (TOUTES_PERMISSIONS as readonly string[]).includes(p));
  await prisma.utilisateur.update({
    where: { id },
    data: { nom, role, actif, permissions: JSON.stringify(perms) },
  });
  revalidatePath("/utilisateurs");
}

export async function resetPermissionsRole(id: number) {
  await requireAdmin();
  const u = await prisma.utilisateur.findUnique({ where: { id } });
  if (!u) throw new Error("Utilisateur introuvable");
  const role = (ROLES as readonly string[]).includes(u.role) ? (u.role as Role) : "caissier";
  const perms = PERMISSIONS_PAR_ROLE[role];
  await prisma.utilisateur.update({
    where: { id },
    data: { permissions: JSON.stringify(perms) },
  });
  revalidatePath("/utilisateurs");
}

export async function resetPassword(email: string, newPassword: string) {
  await requireAdmin();
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const target = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!target) throw new Error("Utilisateur Auth introuvable");
  const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, { password: newPassword });
  if (error) throw new Error(error.message);
}

export async function deleteUtilisateur(id: number) {
  await requireAdmin();
  const u = await prisma.utilisateur.findUnique({ where: { id } });
  if (!u) return;
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const target = users.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
  if (target) await supabaseAdmin.auth.admin.deleteUser(target.id);
  await prisma.utilisateur.delete({ where: { id } });
  revalidatePath("/utilisateurs");
}
