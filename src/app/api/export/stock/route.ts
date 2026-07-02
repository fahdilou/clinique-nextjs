import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toXlsx, xlsxResponse } from "@/lib/excel";
import { getStockActuel } from "@/lib/actions/stock";

export async function GET() {
  await requireUser();
  const [stock, mouv] = await Promise.all([
    getStockActuel(),
    prisma.mouvementStock.findMany({ orderBy: { date_mouvement: "desc" }, include: { produit: true } }),
  ]);

  const buf = await toXlsx([
    {
      name: "État stock",
      headers: ["Code", "Désignation", "Unité", "Stock actuel", "Seuil", "Prix U.", "Valeur", "Alerte"],
      rows: stock.map((p) => [p.code_article, p.designation, p.unite ?? "", p.stock_actuel, p.seuil_alerte ?? 0, p.prix_unitaire ?? 0, p.valeur, p.alerte ? "Oui" : ""]),
    },
    {
      name: "Mouvements",
      headers: ["Date", "Produit", "Type", "Quantité", "Motif", "Par"],
      rows: mouv.map((m) => [m.date_mouvement, m.produit?.designation ?? "", m.type_mouvement, m.quantite, m.motif ?? "", m.user_nom ?? ""]),
    },
  ]);
  return xlsxResponse(buf, `stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
