import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { formatMoney, formatDate } from "@/lib/utils";
import { FactureFormDialog } from "./form-dialog";
import { FactureRowActions } from "./row-actions";
import { ImportFacturesButton } from "./import-button";
import { ExportButton } from "@/components/export-button";
import { computeEcheance } from "@/lib/echeance";

const PAGE_SIZE = 25;

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; assurance?: string; page?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: any = {};
  if (sp.q) where.num_facture = { contains: sp.q, mode: "insensitive" };
  if (sp.statut) where.statut_part_assureur = sp.statut;
  if (sp.assurance) where.assurance_id = Number(sp.assurance);

  const [factures, totalCount, totals, assurances, statCounts] = await Promise.all([
    prisma.facture.findMany({
      where,
      orderBy: { date_facture: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assurance: true },
    }),
    prisma.facture.count({ where }),
    prisma.facture.aggregate({
      where,
      _sum: { montant_total: true, part_assure: true, part_assureur: true, part_assureur_payee: true },
    }),
    prisma.assurance.findMany({ orderBy: { nom: "asc" } }),
    prisma.facture.groupBy({ by: ["statut_part_assureur"], _count: true }),
  ]);

  const countMap = new Map(statCounts.map((s) => [s.statut_part_assureur ?? "?", s._count]));
  const nbTotal = statCounts.reduce((s, x) => s + x._count, 0);
  const nbAttente = (countMap.get("En attente") ?? 0) + (countMap.get("Payé Partiel") ?? 0);
  // Soldées = Soldé (assurance) + N/A (cash - payée directement à la caisse)
  const nbSolde = (countMap.get("Soldé") ?? 0) + (countMap.get("N/A") ?? 0);
  const nbRejete = countMap.get("Rejeté") ?? 0;

  const reste = (totals._sum.part_assureur ?? 0) - (totals._sum.part_assureur_payee ?? 0);
  const encaisseCaisse = totals._sum.part_assure ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factures</h1>
          <p className="text-muted-foreground">Gestion des factures d'assurance</p>
        </div>
        <div className="flex gap-2">
          <ExportButton endpoint="/api/export/factures" filename="factures.xlsx" />
          <ImportFacturesButton />
          <FactureFormDialog assurances={assurances} />
        </div>
      </div>

      {/* Bande stats globales (toutes factures) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total factures</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{nbTotal}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">En attente</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{nbAttente}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Soldées</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{nbSolde}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Rejetées</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{nbRejete}</div></CardContent></Card>
      </div>

      {/* Bande montants (filtre en cours) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">CA (filtré)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(totals._sum.montant_total)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Encaissé caisse</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{formatMoney(encaisseCaisse)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Encaissé assurance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{formatMoney(totals._sum.part_assureur_payee)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Reste dû assurances</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{formatMoney(reste)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registre ({totalCount})</CardTitle>
          <form className="flex flex-wrap gap-2 pt-3" action="/factures">
            <input name="q" placeholder="N° facture..." defaultValue={sp.q}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48" />
            <select name="statut" defaultValue={sp.statut ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Tous statuts</option>
              <option>N/A</option>
              <option>En attente</option>
              <option>Soldé</option>
              <option>Payé Partiel</option>
              <option>Rejeté</option>
            </select>
            <select name="assurance" defaultValue={sp.assurance ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Toutes assurances</option>
              {assurances.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrer</button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH><TH>N°</TH><TH>Assurance</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Caisse</TH>
                <TH className="text-right">Assureur</TH>
                <TH className="text-right">Payé Ass.</TH>
                <TH>Statut</TH>
                <TH>Échéance</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {factures.map((f) => {
                const ech = computeEcheance(f);
                return (
                <TR key={f.id}>
                  <TD>{formatDate(f.date_facture)}</TD>
                  <TD className="font-medium">{f.num_facture}</TD>
                  <TD>{f.assurance?.nom ?? "-"}</TD>
                  <TD className="text-right">{formatMoney(f.montant_total)}</TD>
                  <TD className="text-right text-success">{formatMoney(f.part_assure)}</TD>
                  <TD className="text-right">{formatMoney(f.part_assureur)}</TD>
                  <TD className="text-right text-success">{formatMoney(f.part_assureur_payee)}</TD>
                  <TD>
                    <Badge variant={
                      f.statut_part_assureur === "Soldé" || f.statut_part_assureur === "Payée" ? "success" :
                      f.statut_part_assureur === "N/A" ? "success" :
                      f.statut_part_assureur === "Payé Partiel" || f.statut_part_assureur === "Partiellement payée" ? "warning" :
                      f.statut_part_assureur === "Rejeté" ? "destructive" : "outline"
                    }>{f.statut_part_assureur === "N/A" ? "💰 Payée cash" : f.statut_part_assureur}</Badge>
                  </TD>
                  <TD><Badge variant={ech.color}>{ech.emoji} {ech.label}</Badge></TD>
                  <TD><FactureRowActions
                    assurances={assurances}
                    facture={{
                      id: f.id, num_facture: f.num_facture, date_facture: f.date_facture.toISOString(),
                      montant_total: f.montant_total, assurance_id: f.assurance_id,
                      part_assureur: f.part_assureur ?? 0, part_assureur_payee: f.part_assureur_payee ?? 0,
                      part_assure: f.part_assure ?? 0, statut_part_assureur: f.statut_part_assureur ?? "En attente",
                      date_depot: f.date_depot?.toISOString() ?? null,
                      motif_ecart_assurance: f.motif_ecart_assurance,
                    }} /></TD>
                </TR>
                );
              })}
              {factures.length === 0 && (
                <TR><TD colSpan={10} className="text-center py-8 text-muted-foreground">Aucune facture</TD></TR>
              )}
            </TBody>
          </Table>
          <Pagination basePath="/factures" currentParams={sp} page={page} pageSize={PAGE_SIZE} total={totalCount} />
        </CardContent>
      </Card>
    </div>
  );
}
