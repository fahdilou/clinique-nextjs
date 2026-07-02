import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { formatMoney, formatDate } from "@/lib/utils";
import { CATEGORIES_DEPENSES } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { DepenseForm, DeleteBtn } from "./client";
import { ImportDepensesButton } from "./import-button";
import { ExportButton } from "@/components/export-button";
import { BatchDeleteButton } from "./batch-delete";

const PAGE_SIZE = 25;

export default async function DepensesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; from?: string; to?: string; q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const canManage = hasPermission(user.role, user.permissions, "gerer_depenses");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: any = {};
  if (sp.categorie) where.categorie = sp.categorie;
  if (sp.from || sp.to) {
    where.date_depense = {};
    if (sp.from) where.date_depense.gte = new Date(sp.from);
    if (sp.to) where.date_depense.lte = new Date(sp.to);
  }
  if (sp.q) {
    where.OR = [
      { description: { contains: sp.q, mode: "insensitive" } },
      { beneficiaire: { contains: sp.q, mode: "insensitive" } },
      { num_facture: { contains: sp.q, mode: "insensitive" } },
    ];
  }

  const [depenses, totalCount, agg] = await Promise.all([
    prisma.depense.findMany({
      where,
      orderBy: { date_depense: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.depense.count({ where }),
    prisma.depense.aggregate({ _sum: { montant: true }, where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dépenses</h1>
          <p className="text-muted-foreground">Suivi des dépenses de la clinique</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton endpoint="/api/export/depenses" filename="depenses.xlsx" />
          {canManage && <ImportDepensesButton />}
          {user.role === "admin" && <BatchDeleteButton />}
        </div>
      </div>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Nouvelle dépense</CardTitle></CardHeader>
          <CardContent><DepenseForm /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Registre ({totalCount})</span>
            <span className="text-base font-normal text-muted-foreground">
              Total filtré : <span className="font-semibold text-foreground">{formatMoney(agg._sum.montant ?? 0)}</span>
            </span>
          </CardTitle>
          <form className="flex flex-wrap gap-2 pt-3" action="/depenses">
            <input name="q" placeholder="Recherche..." defaultValue={sp.q}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-48" />
            <select name="categorie" defaultValue={sp.categorie ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Toutes catégories</option>
              {CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" name="from" defaultValue={sp.from} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <input type="date" name="to" defaultValue={sp.to} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
            <button className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrer</button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Catégorie</TH><TH>Description</TH><TH>Bénéficiaire</TH><TH>Mode</TH>
                <TH className="text-right">Montant</TH>{canManage && <TH></TH>}</TR>
            </THead>
            <TBody>
              {depenses.map((d) => (
                <TR key={d.id}>
                  <TD>{formatDate(d.date_depense)}</TD>
                  <TD><Badge variant="outline">{d.categorie}</Badge></TD>
                  <TD className="max-w-xs truncate">{d.description ?? "-"}</TD>
                  <TD>{d.beneficiaire ?? "-"}</TD>
                  <TD>{d.mode_paiement}</TD>
                  <TD className="text-right font-medium">{formatMoney(d.montant)}</TD>
                  {canManage && <TD className="text-right"><DeleteBtn id={d.id} /></TD>}
                </TR>
              ))}
              {depenses.length === 0 && (
                <TR><TD colSpan={7} className="text-center py-8 text-muted-foreground">Aucune dépense</TD></TR>
              )}
            </TBody>
          </Table>
          <Pagination basePath="/depenses" currentParams={sp} page={page} pageSize={PAGE_SIZE} total={totalCount} />
        </CardContent>
      </Card>
    </div>
  );
}
