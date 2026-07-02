import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { getStockActuel } from "@/lib/actions/stock";
import { ProduitForm, MouvementForm, ProduitRowActions } from "./client";
import { ImportProduitsButton } from "./import-button";
import { ExportButton } from "@/components/export-button";
import { Pagination } from "@/components/pagination";

const PAGE_SIZE = 20;

export default async function StockPage({
  searchParams,
}: { searchParams: Promise<{ page?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [stock, mouvements, movTotal] = await Promise.all([
    getStockActuel(),
    prisma.mouvementStock.findMany({
      orderBy: { date_mouvement: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { produit: true },
    }),
    prisma.mouvementStock.count(),
  ]);

  const alertes = stock.filter((s) => s.alerte).length;
  const valeurTotale = stock.reduce((s, p) => s + p.valeur, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="text-muted-foreground">Gestion des produits et mouvements</p>
        </div>
        <div className="flex gap-2">
          <ExportButton endpoint="/api/export/stock" filename="stock.xlsx" />
          <ImportProduitsButton />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Produits actifs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stock.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Alertes seuil</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{alertes}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Valeur stock</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(valeurTotale)}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nouveau produit</CardTitle></CardHeader>
          <CardContent><ProduitForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Mouvement (entrée / sortie)</CardTitle></CardHeader>
          <CardContent><MouvementForm produits={stock.map((s) => ({ id: s.id, designation: s.designation }))} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>État du stock</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Code</TH><TH>Désignation</TH><TH>Unité</TH>
                <TH className="text-right">Stock</TH><TH className="text-right">Seuil</TH>
                <TH className="text-right">Prix U.</TH><TH className="text-right">Valeur</TH><TH>Alerte</TH><TH></TH></TR>
            </THead>
            <TBody>
              {stock.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.code_article}</TD>
                  <TD className="font-medium">{p.designation}</TD>
                  <TD>{p.unite}</TD>
                  <TD className="text-right font-semibold">{p.stock_actuel}</TD>
                  <TD className="text-right text-muted-foreground">{p.seuil_alerte}</TD>
                  <TD className="text-right">{formatMoney(p.prix_unitaire)}</TD>
                  <TD className="text-right">{formatMoney(p.valeur)}</TD>
                  <TD>{p.alerte && <Badge variant="warning">Alerte</Badge>}</TD>
                  <TD><ProduitRowActions produit={{ id: p.id, code_article: p.code_article, designation: p.designation, prix_unitaire: p.prix_unitaire ?? 0, unite: p.unite ?? "unité", seuil_alerte: p.seuil_alerte ?? 5 }} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des mouvements ({movTotal})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Date</TH><TH>Produit</TH><TH>Type</TH><TH className="text-right">Quantité</TH><TH>Motif</TH><TH>Par</TH></TR></THead>
            <TBody>
              {mouvements.map((m) => (
                <TR key={m.id}>
                  <TD>{formatDate(m.date_mouvement)}</TD>
                  <TD>{m.produit?.designation ?? "-"}</TD>
                  <TD><Badge variant={m.type_mouvement === "entree" ? "success" : "destructive"}>{m.type_mouvement}</Badge></TD>
                  <TD className="text-right">{m.quantite}</TD>
                  <TD>{m.motif ?? "-"}</TD>
                  <TD className="text-muted-foreground">{m.user_nom ?? "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination basePath="/stock" currentParams={sp} page={page} pageSize={PAGE_SIZE} total={movTotal} />
        </CardContent>
      </Card>
    </div>
  );
}
