"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const factureSchema = z.object({
  date_facture: z.string().min(1),
  num_facture: z.string().min(1),
  montant_total: z.coerce.number().nonnegative(),
  assurance_id: z.coerce.number().int().optional().nullable(),
  part_assureur: z.coerce.number().nonnegative().default(0),
  part_assure: z.coerce.number().nonnegative().default(0),
  statut_part_assureur: z.string().default("En attente"),
  date_depot: z.string().optional().nullable(),
  motif_ecart_assurance: z.string().optional().nullable(),
});

// Auto-calcul du statut selon la part assureur
function autoStatut(part_assureur: number, provided?: string): string {
  if (part_assureur <= 0) return "N/A";
  return provided || "En attente";
}

// Auto-correction années hors bornes (ex: 2006 → 2026)
function corrigerAnnee(d: Date | null): Date | null {
  if (!d) return null;
  const y = d.getFullYear();
  if (y < 2024 || y > 2028) {
    const fixed = new Date(d);
    fixed.setFullYear(2026);
    return fixed;
  }
  return d;
}

// Garantit l'existence de "SANS ASSURANCE" et retourne son id
export async function ensureSansAssurance(): Promise<number> {
  const existing = await prisma.assurance.findFirst({ where: { nom: "SANS ASSURANCE" } });
  if (existing) return existing.id;
  const created = await prisma.assurance.create({ data: { nom: "SANS ASSURANCE", email: null } });
  return created.id;
}

export async function createFacture(formData: FormData) {
  await requireUser();
  const raw = Object.fromEntries(formData);
  const data = factureSchema.parse({
    ...raw,
    assurance_id: raw.assurance_id ? Number(raw.assurance_id) : null,
    date_depot: raw.date_depot || null,
  });
  await prisma.facture.create({
    data: {
      date_facture: new Date(data.date_facture),
      num_facture: data.num_facture,
      montant_total: data.montant_total,
      assurance_id: data.assurance_id ?? null,
      part_assureur: data.part_assureur,
      part_assure: data.part_assure,
      statut_part_assureur: autoStatut(data.part_assureur, data.statut_part_assureur),
      statut_part_assure: "Payée par Caisse",
      date_depot: data.date_depot ? new Date(data.date_depot) : null,
    },
  });
  revalidatePath("/factures");
}

export async function updateFacture(id: number, formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("corriger_factures")) throw new Error("Non autorisé");
  const raw = Object.fromEntries(formData);
  const data = factureSchema.parse({
    ...raw,
    assurance_id: raw.assurance_id ? Number(raw.assurance_id) : null,
    date_depot: raw.date_depot || null,
  });
  const statut = autoStatut(data.part_assureur, data.statut_part_assureur);
  await prisma.facture.update({
    where: { id },
    data: {
      date_facture: new Date(data.date_facture),
      num_facture: data.num_facture,
      montant_total: data.montant_total,
      assurance_id: data.assurance_id ?? null,
      part_assureur: data.part_assureur,
      part_assure: data.part_assure,
      statut_part_assureur: statut,
      date_depot: data.date_depot ? new Date(data.date_depot) : null,
      motif_ecart_assurance: statut === "Soldé" || statut === "N/A" ? null : (data.motif_ecart_assurance || null),
    },
  });
  revalidatePath("/factures");
}

export type EncaissementLine = {
  id: number;
  montant_recu: number;
  motif?: string | null;
};

export async function batchEncaissement(lines: EncaissementLine[], dateEncaissement: string) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("encaisser_virements")) throw new Error("Non autorisé");
  if (!dateEncaissement) throw new Error("La date d'encaissement est obligatoire");
  const encDate = new Date(dateEncaissement);
  if (isNaN(encDate.getTime())) throw new Error("Date d'encaissement invalide");

  const factures = await prisma.facture.findMany({
    where: { id: { in: lines.map((l) => l.id) } },
    select: { id: true, part_assureur: true },
  });
  const facMap = new Map(factures.map((f) => [f.id, f.part_assureur ?? 0]));

  await prisma.$transaction(
    lines.map((l) => {
      const partAss = facMap.get(l.id) ?? 0;
      let statut = "En attente";
      if (l.montant_recu >= partAss && partAss > 0) statut = "Soldé";
      else if (l.montant_recu > 0 && l.montant_recu < partAss) statut = "Payé Partiel";
      else if (l.montant_recu === 0) statut = "Rejeté";
      return prisma.facture.update({
        where: { id: l.id },
        data: {
          part_assureur_payee: l.montant_recu,
          statut_part_assureur: statut,
          date_encaissement: encDate,
          motif_ecart_assurance: statut === "Soldé" ? null : (l.motif || null),
        },
      });
    })
  );
  revalidatePath("/encaissement");
  revalidatePath("/factures");
}

export async function batchUpdateDepot(ids: number[], date_depot: string) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("gerer_depots")) throw new Error("Non autorisé");
  await prisma.facture.updateMany({
    where: { id: { in: ids } },
    data: { date_depot: new Date(date_depot) },
  });
  revalidatePath("/factures");
}

export async function updateFacturePayment(id: number, montantPaye: number, dateEncaissement: string) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("encaisser_virements")) throw new Error("Non autorisé");
  if (!dateEncaissement) throw new Error("La date d'encaissement est obligatoire");
  const encDate = new Date(dateEncaissement);
  if (isNaN(encDate.getTime())) throw new Error("Date d'encaissement invalide");
  const f = await prisma.facture.findUnique({ where: { id } });
  if (!f) throw new Error("Facture introuvable");
  const partAss = f.part_assureur ?? 0;
  let statut = "En attente";
  if (montantPaye >= partAss && partAss > 0) statut = "Soldé";
  else if (montantPaye > 0 && montantPaye < partAss) statut = "Payé Partiel";
  else if (montantPaye === 0) statut = "En attente";
  await prisma.facture.update({
    where: { id },
    data: {
      part_assureur_payee: montantPaye,
      statut_part_assureur: statut,
      date_encaissement: encDate,
    },
  });
  revalidatePath("/factures");
}

export async function importFactures(rows: Record<string, string>[]) {
  await requireUser();
  const { parseDate, num } = await import("@/lib/csv");
  const assurances = await prisma.assurance.findMany();
  const assMap = new Map(assurances.map((a) => [a.nom.toLowerCase(), a.id]));

  let inserted = 0;
  const errors: string[] = [];

  for (const [i, r] of rows.entries()) {
    try {
      const num_facture = (r.num_facture || r["n°"] || r.numero || "").trim();
      const dateFact = parseDate(r.date_facture || r.date);
      if (!num_facture || !dateFact) { errors.push(`Ligne ${i + 2} : num_facture ou date manquant`); continue; }

      const assNom = (r.assurance || "").trim();
      const assurance_id = assNom ? assMap.get(assNom.toLowerCase()) ?? null : null;

      const partAss = num(r.part_assureur);
      const dateFinal = corrigerAnnee(dateFact);
      const dateDepFinal = corrigerAnnee(parseDate(r.date_depot));
      await prisma.facture.upsert({
        where: { num_facture },
        update: {},
        create: {
          num_facture,
          date_facture: dateFinal!,
          montant_total: num(r.montant_total || r.montant),
          part_assureur: partAss,
          part_assureur_payee: num(r.part_assureur_payee),
          part_assure: num(r.part_assure),
          statut_part_assureur: autoStatut(partAss, r.statut_part_assureur || r.statut),
          statut_part_assure: r.statut_part_assure || "Payée par Caisse",
          assurance_id,
          date_depot: dateDepFinal,
        },
      });
      inserted++;
    } catch (e: any) { errors.push(`Ligne ${i + 2} : ${e?.message ?? "erreur"}`); }
  }
  revalidatePath("/factures");
  return { inserted, errors };
}

export async function resetPaiementBanque(id: number, motif?: string) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("encaisser_virements")) throw new Error("Non autorisé");
  await prisma.facture.update({
    where: { id },
    data: {
      part_assureur_payee: 0,
      statut_part_assureur: "En attente",
      date_encaissement: null,
      motif_ecart_assurance: motif || null,
    },
  });
  revalidatePath("/factures");
  revalidatePath("/encaissement");
}

export async function deleteFacture(id: number) {
  const user = await requireUser();
  if (user.role !== "admin" && !user.permissions.has("corriger_factures")) throw new Error("Non autorisé");
  await prisma.facture.delete({ where: { id } });
  revalidatePath("/factures");
}
