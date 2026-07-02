"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAssPerm() {
  const u = await requireUser();
  if (u.role !== "admin" && !u.permissions.has("gerer_assurances")) throw new Error("Non autorisé");
  return u;
}

export async function createAssurance(formData: FormData) {
  await requireAssPerm();
  const nom = String(formData.get("nom") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  if (!nom) throw new Error("Nom requis");
  await prisma.assurance.create({ data: { nom, email } });
  revalidatePath("/assurances");
}

export async function updateAssurance(id: number, formData: FormData) {
  await requireAssPerm();
  const nom = String(formData.get("nom") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  await prisma.assurance.update({ where: { id }, data: { nom, email } });
  revalidatePath("/assurances");
}

export async function importAssurances(rows: Record<string, string>[]) {
  await requireAssPerm();
  let inserted = 0;
  const errors: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const nom = (r.nom || r.compagnie || "").trim();
      if (!nom) { errors.push(`Ligne ${i + 2} : nom manquant`); continue; }
      await prisma.assurance.upsert({
        where: { nom },
        update: { email: r.email?.trim() || null },
        create: { nom, email: r.email?.trim() || null },
      });
      inserted++;
    } catch (e: any) { errors.push(`Ligne ${i + 2} : ${e?.message ?? "erreur"}`); }
  }
  revalidatePath("/assurances");
  return { inserted, errors };
}

export async function deleteAssurance(id: number) {
  await requireAssPerm();
  const nb = await prisma.facture.count({ where: { assurance_id: id } });
  if (nb > 0) throw new Error("Impossible : des factures sont liées");
  await prisma.assurance.delete({ where: { id } });
  revalidatePath("/assurances");
}
