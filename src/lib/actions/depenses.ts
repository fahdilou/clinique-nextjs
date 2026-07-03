"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requirePerm() {
  const u = await requireUser();
  if (u.role !== "admin" && !u.permissions.has("gerer_depenses")) throw new Error("Non autorisé");
  return u;
}

export async function createDepense(formData: FormData) {
  const u = await requirePerm();
  const date = String(formData.get("date_depense") || "");
  const categorie = String(formData.get("categorie") || "");
  const montant = Number(formData.get("montant") || 0);
  if (!date || !categorie || !montant) throw new Error("Champs obligatoires manquants");

  await prisma.depense.create({
    data: {
      date_depense: new Date(date),
      categorie,
      description: String(formData.get("description") || "") || null,
      montant,
      num_facture: String(formData.get("num_facture") || "") || null,
      mode_paiement: String(formData.get("mode_paiement") || "Espèces"),
      beneficiaire: String(formData.get("beneficiaire") || "") || null,
      user_nom: u.nom,
    },
  });
  revalidatePath("/depenses");
}

export async function importDepenses(rows: Record<string, string>[]) {
  const u = await requirePerm();
  const { parseDate, num } = await import("@/lib/csv");
  let inserted = 0;
  const errors: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const d = parseDate(r.date_depense || r.date);
      const cat = (r.categorie || r.category || "").trim();
      const m = num(r.montant);
      if (!d || !cat || !m) { errors.push(`Ligne ${i + 2} : date/catégorie/montant requis`); continue; }
      await prisma.depense.create({
        data: {
          date_depense: d,
          categorie: cat,
          description: r.description?.trim() || null,
          montant: m,
          num_facture: r.num_facture?.trim() || null,
          mode_paiement: r.mode_paiement?.trim() || "Espèces",
          beneficiaire: r.beneficiaire?.trim() || null,
          user_nom: u.nom,
        },
      });
      inserted++;
    } catch (e: any) { errors.push(`Ligne ${i + 2} : ${e?.message ?? "erreur"}`); }
  }
  revalidatePath("/depenses");
  return { inserted, errors };
}

export async function updateDepense(id: number, formData: FormData) {
  await requirePerm();
  const date = String(formData.get("date_depense") || "");
  const categorie = String(formData.get("categorie") || "");
  const montant = Number(formData.get("montant") || 0);
  if (!date || !categorie || !montant) throw new Error("Champs obligatoires manquants");

  await prisma.depense.update({
    where: { id },
    data: {
      date_depense: new Date(date),
      categorie,
      description: String(formData.get("description") || "") || null,
      montant,
      num_facture: String(formData.get("num_facture") || "") || null,
      mode_paiement: String(formData.get("mode_paiement") || "Espèces"),
      beneficiaire: String(formData.get("beneficiaire") || "") || null,
    },
  });
  revalidatePath("/depenses");
}

export type BatchDeleteMode = { type: "annee"; annee: number } | { type: "mois"; annee: number; mois: number } | { type: "categorie"; categorie: string } | { type: "tout" };

export async function batchDeleteDepenses(mode: BatchDeleteMode, confirmToken: string) {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Réservé aux administrateurs");
  if (mode.type === "tout" && confirmToken !== "CONFIRMER") {
    throw new Error("Token de confirmation invalide (tapez CONFIRMER)");
  }

  let where: any = {};
  if (mode.type === "annee") {
    where.date_depense = { gte: new Date(mode.annee, 0, 1), lt: new Date(mode.annee + 1, 0, 1) };
  } else if (mode.type === "mois") {
    where.date_depense = { gte: new Date(mode.annee, mode.mois - 1, 1), lt: new Date(mode.annee, mode.mois, 1) };
  } else if (mode.type === "categorie") {
    where.categorie = mode.categorie;
  }

  const result = await prisma.depense.deleteMany({ where });
  revalidatePath("/depenses");
  return { deleted: result.count };
}

export async function previewBatchDelete(mode: BatchDeleteMode) {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Réservé aux administrateurs");

  let where: any = {};
  if (mode.type === "annee") {
    where.date_depense = { gte: new Date(mode.annee, 0, 1), lt: new Date(mode.annee + 1, 0, 1) };
  } else if (mode.type === "mois") {
    where.date_depense = { gte: new Date(mode.annee, mode.mois - 1, 1), lt: new Date(mode.annee, mode.mois, 1) };
  } else if (mode.type === "categorie") {
    where.categorie = mode.categorie;
  }

  const agg = await prisma.depense.aggregate({ where, _count: true, _sum: { montant: true } });
  return { count: agg._count, total: agg._sum.montant ?? 0 };
}

export async function deleteDepense(id: number) {
  await requirePerm();
  await prisma.depense.delete({ where: { id } });
  revalidatePath("/depenses");
}
