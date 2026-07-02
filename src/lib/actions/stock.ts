"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProduit(formData: FormData) {
  await requireUser();
  await prisma.produit.create({
    data: {
      code_article: String(formData.get("code_article") || "").trim(),
      designation: String(formData.get("designation") || "").trim(),
      prix_unitaire: Number(formData.get("prix_unitaire") || 0),
      unite: String(formData.get("unite") || "unité"),
      stock_initial: Number(formData.get("stock_initial") || 0),
      seuil_alerte: Number(formData.get("seuil_alerte") || 5),
      actif: 1,
    },
  });
  revalidatePath("/stock");
}

export async function importProduits(rows: Record<string, string>[]) {
  await requireUser();
  const { num } = await import("@/lib/csv");
  let inserted = 0;
  const errors: string[] = [];
  for (const [i, r] of rows.entries()) {
    try {
      const code = (r.code_article || r.code || "").trim();
      const designation = (r.designation || r.désignation || "").trim();
      if (!code || !designation) { errors.push(`Ligne ${i + 2} : code_article et designation requis`); continue; }
      await prisma.produit.upsert({
        where: { code_article: code },
        update: {
          designation,
          prix_unitaire: num(r.prix_unitaire, 0),
          unite: r.unite?.trim() || "unité",
          seuil_alerte: Math.trunc(num(r.seuil_alerte, 5)),
        },
        create: {
          code_article: code,
          designation,
          prix_unitaire: num(r.prix_unitaire, 0),
          unite: r.unite?.trim() || "unité",
          stock_initial: Math.trunc(num(r.stock_initial, 0)),
          seuil_alerte: Math.trunc(num(r.seuil_alerte, 5)),
          actif: 1,
        },
      });
      inserted++;
    } catch (e: any) { errors.push(`Ligne ${i + 2} : ${e?.message ?? "erreur"}`); }
  }
  revalidatePath("/stock");
  return { inserted, errors };
}

export async function updateProduit(id: number, formData: FormData) {
  await requireUser();
  const { num } = await import("@/lib/csv");
  await prisma.produit.update({
    where: { id },
    data: {
      code_article: String(formData.get("code_article") || "").trim(),
      designation: String(formData.get("designation") || "").trim(),
      prix_unitaire: num(String(formData.get("prix_unitaire") || "0")),
      unite: String(formData.get("unite") || "unité"),
      seuil_alerte: Math.trunc(num(String(formData.get("seuil_alerte") || "5"))),
    },
  });
  revalidatePath("/stock");
}

export async function deleteProduit(id: number) {
  await requireUser();
  const nb = await prisma.mouvementStock.count({ where: { produit_id: id } });
  if (nb > 0) throw new Error("Impossible : des mouvements de stock sont liés à ce produit. Désactivez-le à la place.");
  await prisma.produit.delete({ where: { id } });
  revalidatePath("/stock");
}

export async function toggleProduit(id: number, actif: boolean) {
  await requireUser();
  await prisma.produit.update({ where: { id }, data: { actif: actif ? 1 : 0 } });
  revalidatePath("/stock");
}

export async function createMouvement(formData: FormData) {
  const u = await requireUser();
  const type = String(formData.get("type_mouvement") || "");
  if (!["entree", "sortie"].includes(type)) throw new Error("Type invalide");
  await prisma.mouvementStock.create({
    data: {
      date_mouvement: new Date(String(formData.get("date_mouvement"))),
      produit_id: Number(formData.get("produit_id")),
      type_mouvement: type,
      quantite: Number(formData.get("quantite")),
      motif: String(formData.get("motif") || "") || null,
      user_nom: u.nom,
    },
  });
  revalidatePath("/stock");
}

export async function getStockActuel() {
  const [produits, movs] = await Promise.all([
    prisma.produit.findMany({ where: { actif: 1 }, orderBy: { designation: "asc" } }),
    prisma.mouvementStock.groupBy({
      by: ["produit_id", "type_mouvement"],
      _sum: { quantite: true },
    }),
  ]);

  return produits.map((p) => {
    const entrees = movs.find((m) => m.produit_id === p.id && m.type_mouvement === "entree")?._sum.quantite ?? 0;
    const sorties = movs.find((m) => m.produit_id === p.id && m.type_mouvement === "sortie")?._sum.quantite ?? 0;
    const stock = (p.stock_initial ?? 0) + entrees - sorties;
    return { ...p, stock_actuel: stock, valeur: stock * (p.prix_unitaire ?? 0), alerte: stock <= (p.seuil_alerte ?? 5) };
  });
}
