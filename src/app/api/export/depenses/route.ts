import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toXlsx, xlsxResponse } from "@/lib/excel";

export async function GET() {
  await requireUser();
  const dep = await prisma.depense.findMany({ orderBy: { date_depense: "desc" } });
  const rows = dep.map((d) => [
    d.date_depense, d.categorie, d.description ?? "", d.montant,
    d.beneficiaire ?? "", d.mode_paiement ?? "", d.num_facture ?? "", d.user_nom ?? "",
  ]);
  const buf = await toXlsx([{
    name: "Dépenses",
    headers: ["Date", "Catégorie", "Description", "Montant", "Bénéficiaire", "Mode paiement", "N° Facture", "Saisi par"],
    rows,
  }]);
  return xlsxResponse(buf, `depenses_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
