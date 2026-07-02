import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toXlsx, xlsxResponse } from "@/lib/excel";

export async function GET(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const annee = Number(url.searchParams.get("annee")) || new Date().getFullYear();
  const start = new Date(annee, 0, 1);
  const end = new Date(annee + 1, 0, 1);

  const [monthly, assurances, catDep, factures, depenses] = await Promise.all([
    prisma.$queryRaw<{ mois: Date; nb: number; ca: number; caisse: number; assur_du: number; assur_paye: number }[]>`
      SELECT date_trunc('month', date_facture) AS mois,
             COUNT(*)::int AS nb,
             COALESCE(SUM(montant_total),0)::float AS ca,
             COALESCE(SUM(part_assure),0)::float AS caisse,
             COALESCE(SUM(part_assureur),0)::float AS assur_du,
             COALESCE(SUM(part_assureur_payee),0)::float AS assur_paye
      FROM factures WHERE date_facture >= ${start} AND date_facture < ${end}
      GROUP BY 1 ORDER BY 1
    `,
    prisma.assurance.findMany({
      include: { factures: { where: { date_facture: { gte: start, lt: end } }, select: { part_assureur: true, part_assureur_payee: true } } },
    }),
    prisma.depense.groupBy({
      by: ["categorie"],
      where: { date_depense: { gte: start, lt: end } },
      _sum: { montant: true },
      orderBy: { _sum: { montant: "desc" } },
    }),
    prisma.facture.findMany({
      where: { date_facture: { gte: start, lt: end } },
      include: { assurance: true },
      orderBy: { date_facture: "asc" },
    }),
    prisma.depense.findMany({
      where: { date_depense: { gte: start, lt: end } },
      orderBy: { date_depense: "asc" },
    }),
  ]);

  const buf = await toXlsx([
    {
      name: "Volumes mensuels",
      headers: ["Mois", "Nb factures", "CA total", "Caisse (patient)", "Assureur dû", "Assureur payé", "Reste"],
      rows: monthly.map((m) => [m.mois, m.nb, m.ca, m.caisse, m.assur_du, m.assur_paye, m.assur_du - m.assur_paye]),
    },
    {
      name: "Qui paie bien",
      headers: ["Compagnie", "Nb", "Émis", "Encaissé", "Reste", "Taux %"],
      rows: assurances.filter((a) => a.factures.length).map((a) => {
        const total = a.factures.reduce((s, x) => s + (x.part_assureur ?? 0), 0);
        const paye = a.factures.reduce((s, x) => s + (x.part_assureur_payee ?? 0), 0);
        return [a.nom, a.factures.length, total, paye, total - paye, total ? Math.round((paye / total) * 100) : 0];
      }).sort((a, b) => (b[5] as number) - (a[5] as number)),
    },
    {
      name: "Dépenses par catégorie",
      headers: ["Catégorie", "Montant"],
      rows: catDep.map((c) => [c.categorie, c._sum.montant ?? 0]),
    },
    {
      name: "Registre factures",
      headers: ["Date", "N°", "Assurance", "Total", "Caisse", "Assur dû", "Assur payé", "Statut", "Date dépôt"],
      rows: factures.map((f) => [
        f.date_facture, f.num_facture, f.assurance?.nom ?? "",
        f.montant_total, f.part_assure ?? 0, f.part_assureur ?? 0, f.part_assureur_payee ?? 0,
        f.statut_part_assureur ?? "", f.date_depot ?? null,
      ]),
    },
    {
      name: "Registre dépenses",
      headers: ["Date", "Catégorie", "Description", "Montant", "Bénéficiaire", "Mode"],
      rows: depenses.map((d) => [d.date_depense, d.categorie, d.description ?? "", d.montant, d.beneficiaire ?? "", d.mode_paiement ?? ""]),
    },
  ]);
  return xlsxResponse(buf, `analyses_${annee}.xlsx`);
}
