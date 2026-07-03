import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { getStockActuel } from "@/lib/actions/stock";
import { ProduitForm, MouvementForm, ProduitRowActions } from "./client";
import { ImportProduitsButton } from "./import-button";
import { ExportButton } from "@/components/export-button";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import { Package, ArrowUpDown, ClipboardList, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

const PAGE_SIZE = 20;

type Tab = "etat" | "produits" | "mouvements";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab; page?: string; q?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const tab: Tab = sp.tab && ["etat", "produits", "mouvements"].includes(sp.tab) ? sp.tab : "etat";
  const page = Math.max(1, Number(sp.page) || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="text-muted-foreground">Gestion des produits et mouvements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton endpoint="/api/export/stock" filename="stock.xlsx" />
          {tab === "produits" && <ImportProduitsButton />}
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b flex gap-1">
        <TabLink href="?tab=etat" active={tab === "etat"} icon={ClipboardList}>État du stock</TabLink>
        <TabLink href="?tab=produits" active={tab === "produits"} icon={Package}>Produits</TabLink>
        <TabLink href="?tab=mouvements" active={tab === "mouvements"} icon={ArrowUpDown}>Mouvements</TabLink>
      </div>

      {tab === "etat" && <EtatStock />}
      {tab === "produits" && <ProduitsSection q={sp.q} />}
      {tab === "mouvements" && <MouvementsSection page={page} sp={sp} />}
    </div>
  );
}

function TabLink({ href, active, icon: Icon, children }: {
  href: string; active: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
        }`}>
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

/* ═══ ÉTAT DU STOCK ═══ */
async function EtatStock() {
  const stock = await getStockActuel();
  const alertes = stock.filter((s) => s.alerte && s.stock_actuel > 0).length;
  const ruptures = stock.filter((s) => s.stock_actuel <= 0).length;
  const valeurTotale = stock.reduce((s, p) => s + p.valeur, 0);

  const sorted = [...stock].sort((a, b) => {
    // Priorité : ruptures d'abord, puis alertes, puis A→Z
    if (a.stock_actuel <= 0 && b.stock_actuel > 0) return -1;
    if (b.stock_actuel <= 0 && a.stock_actuel > 0) return 1;
    if (a.alerte && !b.alerte) return -1;
    if (b.alerte && !a.alerte) return 1;
    return a.designation.localeCompare(b.designation);
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Produits actifs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stock.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Ruptures</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{ruptures}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Alertes seuil</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{alertes}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Valeur stock</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(valeurTotale)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>État actuel (ruptures et alertes en premier)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Code</TH><TH>Désignation</TH><TH>Unité</TH>
                <TH className="text-right">Stock</TH><TH className="text-right">Seuil</TH>
                <TH className="text-right">Prix U.</TH><TH className="text-right">Valeur</TH><TH>Statut</TH></TR>
            </THead>
            <TBody>
              {sorted.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.code_article}</TD>
                  <TD className="font-medium">{p.designation}</TD>
                  <TD>{p.unite}</TD>
                  <TD className="text-right font-semibold">{p.stock_actuel}</TD>
                  <TD className="text-right text-muted-foreground">{p.seuil_alerte}</TD>
                  <TD className="text-right">{formatMoney(p.prix_unitaire)}</TD>
                  <TD className="text-right">{formatMoney(p.valeur)}</TD>
                  <TD>
                    {p.stock_actuel <= 0
                      ? <Badge variant="destructive">🔴 Rupture</Badge>
                      : p.alerte
                        ? <Badge variant="warning">🟠 Alerte</Badge>
                        : <Badge variant="success">🟢 OK</Badge>}
                  </TD>
                </TR>
              ))}
              {stock.length === 0 && (
                <TR><TD colSpan={8} className="text-center py-8 text-muted-foreground">Aucun produit actif</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/* ═══ PRODUITS ═══ */
async function ProduitsSection({ q }: { q?: string }) {
  const where: any = { actif: 1 };
  if (q) where.OR = [
    { code_article: { contains: q, mode: "insensitive" } },
    { designation: { contains: q, mode: "insensitive" } },
  ];

  const produits = await prisma.produit.findMany({
    where,
    orderBy: { designation: "asc" },
    take: 500,
  });

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Ajouter un nouveau produit</CardTitle></CardHeader>
        <CardContent><ProduitForm /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue ({produits.length})</CardTitle>
          <form className="flex gap-2 pt-3" action="/stock">
            <input type="hidden" name="tab" value="produits" />
            <input name="q" placeholder="Rechercher code ou désignation..." defaultValue={q}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
            <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Rechercher</button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Code</TH><TH>Désignation</TH><TH>Unité</TH>
                <TH className="text-right">Prix</TH><TH className="text-right">Seuil</TH><TH></TH></TR>
            </THead>
            <TBody>
              {produits.map((p) => (
                <TR key={p.id}>
                  <TD className="font-mono text-xs">{p.code_article}</TD>
                  <TD className="font-medium">{p.designation}</TD>
                  <TD>{p.unite ?? "unité"}</TD>
                  <TD className="text-right">{formatMoney(p.prix_unitaire ?? 0)}</TD>
                  <TD className="text-right">{p.seuil_alerte ?? 5}</TD>
                  <TD>
                    <ProduitRowActions produit={{
                      id: p.id, code_article: p.code_article, designation: p.designation,
                      prix_unitaire: p.prix_unitaire ?? 0, unite: p.unite ?? "unité", seuil_alerte: p.seuil_alerte ?? 5,
                    }} />
                  </TD>
                </TR>
              ))}
              {produits.length === 0 && (
                <TR><TD colSpan={6} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/* ═══ MOUVEMENTS ═══ */
async function MouvementsSection({ page, sp }: { page: number; sp: Record<string, string | undefined> }) {
  const [produits, mouvements, movTotal, sumEntrees, sumSorties] = await Promise.all([
    prisma.produit.findMany({ where: { actif: 1 }, orderBy: { designation: "asc" }, select: { id: true, designation: true } }),
    prisma.mouvementStock.findMany({
      orderBy: { date_mouvement: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { produit: true },
    }),
    prisma.mouvementStock.count(),
    prisma.mouvementStock.aggregate({ where: { type_mouvement: "entree" }, _sum: { quantite: true } }),
    prisma.mouvementStock.aggregate({ where: { type_mouvement: "sortie" }, _sum: { quantite: true } }),
  ]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3 text-success" /> Total entrées</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{sumEntrees._sum.quantite ?? 0}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3 text-destructive" /> Total sorties</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{sumSorties._sum.quantite ?? 0}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total mouvements</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{movTotal}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Enregistrer un mouvement</CardTitle></CardHeader>
        <CardContent><MouvementForm produits={produits} /></CardContent>
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
                  <TD className="text-right font-semibold">{m.quantite}</TD>
                  <TD>{m.motif ?? "-"}</TD>
                  <TD className="text-muted-foreground text-sm">{m.user_nom ?? "-"}</TD>
                </TR>
              ))}
              {mouvements.length === 0 && (
                <TR><TD colSpan={6} className="text-center py-8 text-muted-foreground">Aucun mouvement</TD></TR>
              )}
            </TBody>
          </Table>
          <Pagination basePath="/stock" currentParams={{ ...sp, tab: "mouvements" }} page={page} pageSize={PAGE_SIZE} total={movTotal} />
        </CardContent>
      </Card>
    </>
  );
}
