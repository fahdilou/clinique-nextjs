import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toXlsx, xlsxResponse } from "@/lib/excel";

export async function GET() {
  await requireUser();
  const factures = await prisma.facture.findMany({
    include: { assurance: true },
    orderBy: { date_facture: "desc" },
  });

  const rows = factures.map((f) => [
    f.date_facture, f.num_facture, f.assurance?.nom ?? "",
    f.montant_total, f.part_assureur ?? 0, f.part_assureur_payee ?? 0, f.part_assure ?? 0,
    f.statut_part_assureur ?? "", f.date_depot ?? null,
  ]);

  const buf = await toXlsx([{
    name: "Factures",
    headers: ["Date", "N° Facture", "Assurance", "Montant total", "Part assureur", "Part assureur payée", "Part assuré", "Statut", "Date dépôt"],
    rows,
  }]);
  return xlsxResponse(buf, `factures_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
