import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toXlsx, xlsxResponse } from "@/lib/excel";

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const anneeParam = url.searchParams.get("annee");
  const moisParam = url.searchParams.get("mois");
  const now = new Date();
  const annee = anneeParam === "toutes" ? null : (Number(anneeParam) || now.getFullYear());
  const mois = moisParam === "tous" || !moisParam ? null : Number(moisParam);

  let dateStart: Date | null = null;
  let dateEnd: Date | null = null;
  if (annee !== null) {
    if (mois !== null) { dateStart = new Date(annee, mois - 1, 1); dateEnd = new Date(annee, mois, 1); }
    else { dateStart = new Date(annee, 0, 1); dateEnd = new Date(annee + 1, 0, 1); }
  }
  const factWhere = dateStart ? { date_facture: { gte: dateStart, lt: dateEnd! } } : {};
  const depWhere = dateStart ? { date_depense: { gte: dateStart, lt: dateEnd! } } : {};

  const [factAgg, factures, depenses] = await Promise.all([
    prisma.facture.aggregate({
      where: factWhere,
      _sum: { montant_total: true, part_assure: true, part_assureur: true, part_assureur_payee: true },
      _count: true,
    }),
    prisma.facture.findMany({ where: factWhere, include: { assurance: true }, orderBy: { date_facture: "asc" } }),
    prisma.depense.findMany({ where: depWhere, orderBy: { date_depense: "asc" } }),
  ]);

  const caTotal = factAgg._sum.montant_total ?? 0;
  const caisse = factAgg._sum.part_assure ?? 0;
  const assurDu = factAgg._sum.part_assureur ?? 0;
  const assurPaye = factAgg._sum.part_assureur_payee ?? 0;
  const totalDep = depenses.reduce((s, d) => s + d.montant, 0);
  const encaisse = caisse + assurPaye;
  const beneficeReel = encaisse - totalDep;
  const beneficeTh = caTotal - totalDep;

  const period = annee === null ? "Toutes années" : (mois === null ? `Année ${annee}` : `${annee}-${String(mois).padStart(2, "0")}`);

  const buf = await toXlsx([
    {
      name: "Synthèse",
      headers: ["Indicateur", "Montant (FCFA)"],
      rows: [
        ["Période", period],
        ["Nombre de factures", factAgg._count],
        ["Nombre de dépenses", depenses.length],
        ["", ""],
        ["=== RECETTES ===", ""],
        ["CA total facturé", caTotal],
        ["Part caisse (patients)", caisse],
        ["Part assureur facturé", assurDu],
        ["Part assureur perçue", assurPaye],
        ["Reste à percevoir assurances", assurDu - assurPaye],
        ["TOTAL ENCAISSÉ", encaisse],
        ["", ""],
        ["=== DÉPENSES ===", ""],
        ["Total dépenses", totalDep],
        ["", ""],
        ["=== RÉSULTAT ===", ""],
        ["BÉNÉFICE NET RÉEL", beneficeReel],
        ["Résultat théorique (CA-Dép)", beneficeTh],
      ],
    },
    {
      name: "Factures",
      headers: ["Date", "N°", "Assurance", "Total", "Caisse", "Assur. dû", "Assur. payé", "Statut", "Date dépôt"],
      rows: factures.map((f) => [
        f.date_facture, f.num_facture, f.assurance?.nom ?? "",
        f.montant_total, f.part_assure ?? 0, f.part_assureur ?? 0, f.part_assureur_payee ?? 0,
        f.statut_part_assureur ?? "", f.date_depot ?? null,
      ]),
    },
    {
      name: "Dépenses",
      headers: ["Date", "Catégorie", "Description", "Montant", "Bénéficiaire", "Mode"],
      rows: depenses.map((d) => [d.date_depense, d.categorie, d.description ?? "", d.montant, d.beneficiaire ?? "", d.mode_paiement ?? ""]),
    },
  ]);
  return xlsxResponse(buf, `situation_${period}.xlsx`);
}
