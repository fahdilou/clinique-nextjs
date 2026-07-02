import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ExportButton } from "@/components/export-button";

export default async function AnalysesPage({
  searchParams,
}: { searchParams: Promise<{ annee?: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "voir_analyses") && user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const annee = Number(sp.annee) || new Date().getFullYear();
  const start = new Date(annee, 0, 1);
  const end = new Date(annee + 1, 0, 1);

  const [monthly, assurances, catDep] = await Promise.all([
    // Volumes mensuels : CA + caisse + assurance encaissée
    prisma.$queryRaw<{ mois: Date; nb: number; ca: number; caisse: number; assur_paye: number; assur_du: number }[]>`
      SELECT date_trunc('month', date_facture) AS mois,
             COUNT(*)::int AS nb,
             COALESCE(SUM(montant_total), 0)::float AS ca,
             COALESCE(SUM(part_assure), 0)::float AS caisse,
             COALESCE(SUM(part_assureur_payee), 0)::float AS assur_paye,
             COALESCE(SUM(part_assureur), 0)::float AS assur_du
      FROM factures
      WHERE date_facture >= ${start} AND date_facture < ${end}
      GROUP BY 1 ORDER BY 1 ASC
    `,
    prisma.assurance.findMany({
      include: {
        factures: {
          where: { date_facture: { gte: start, lt: end } },
          select: { montant_total: true, part_assure: true, part_assureur: true, part_assureur_payee: true },
        },
      },
    }),
    prisma.depense.groupBy({
      by: ["categorie"],
      where: { date_depense: { gte: start, lt: end } },
      _sum: { montant: true },
      orderBy: { _sum: { montant: "desc" } },
    }),
  ]);

  const analyseAss = assurances.map((a) => {
    const f = a.factures;
    const total = f.reduce((s, x) => s + (x.part_assureur ?? 0), 0);
    const paye = f.reduce((s, x) => s + (x.part_assureur_payee ?? 0), 0);
    const reste = total - paye;
    const taux = total ? Math.round((paye / total) * 100) : 0;
    return { nom: a.nom, nb: f.length, total, paye, reste, taux };
  }).filter((x) => x.nb > 0).sort((a, b) => b.total - a.total);

  const totalDep = catDep.reduce((s, c) => s + (c._sum.montant ?? 0), 0);
  const years = [annee, annee - 1, annee - 2];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analyses & Statistiques</h1>
          <p className="text-muted-foreground">Année {annee}</p>
        </div>
        <div className="flex gap-2">
          <form action="/analyses" className="flex gap-2">
            <select name="annee" defaultValue={annee} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrer</button>
          </form>
          <ExportButton endpoint={`/api/export/analyses?annee=${annee}`} filename={`analyses_${annee}.xlsx`} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Volumes mensuels {annee}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR>
              <TH>Mois</TH>
              <TH className="text-right">Nb</TH>
              <TH className="text-right">CA</TH>
              <TH className="text-right">Caisse</TH>
              <TH className="text-right">Assur. dû</TH>
              <TH className="text-right">Assur. payé</TH>
              <TH className="text-right">Reste</TH>
              <TH>Recouvrement</TH>
            </TR></THead>
            <TBody>
              {monthly.map((m) => {
                const reste = m.assur_du - m.assur_paye;
                const taux = m.assur_du ? Math.round((m.assur_paye / m.assur_du) * 100) : 100;
                return (
                  <TR key={m.mois.toString()}>
                    <TD className="capitalize">{new Date(m.mois).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</TD>
                    <TD className="text-right">{m.nb}</TD>
                    <TD className="text-right font-medium">{formatMoney(m.ca)}</TD>
                    <TD className="text-right text-success">{formatMoney(m.caisse)}</TD>
                    <TD className="text-right">{formatMoney(m.assur_du)}</TD>
                    <TD className="text-right text-success">{formatMoney(m.assur_paye)}</TD>
                    <TD className="text-right text-destructive">{formatMoney(reste)}</TD>
                    <TD><Badge variant={taux >= 80 ? "success" : taux >= 50 ? "warning" : "destructive"}>{taux}%</Badge></TD>
                  </TR>
                );
              })}
              {monthly.length === 0 && <TR><TD colSpan={8} className="text-center py-6 text-muted-foreground">Aucune donnée</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Qui paie bien — classement par recouvrement</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR>
              <TH>Compagnie</TH>
              <TH className="text-right">Nb</TH>
              <TH className="text-right">Émis</TH>
              <TH className="text-right">Encaissé</TH>
              <TH className="text-right">Reste</TH>
              <TH>Recouvrement</TH>
            </TR></THead>
            <TBody>
              {analyseAss.map((a, i) => (
                <TR key={a.nom}>
                  <TD className="font-medium">
                    <span className="text-muted-foreground mr-2">#{i + 1}</span>{a.nom}
                  </TD>
                  <TD className="text-right">{a.nb}</TD>
                  <TD className="text-right">{formatMoney(a.total)}</TD>
                  <TD className="text-right text-success">{formatMoney(a.paye)}</TD>
                  <TD className="text-right text-destructive">{formatMoney(a.reste)}</TD>
                  <TD><Badge variant={a.taux >= 80 ? "success" : a.taux >= 50 ? "warning" : "destructive"}>{a.taux}%</Badge></TD>
                </TR>
              ))}
              {analyseAss.length === 0 && <TR><TD colSpan={6} className="text-center py-6 text-muted-foreground">Aucune donnée</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dépenses par catégorie {annee}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Catégorie</TH><TH className="text-right">Montant</TH><TH className="text-right">% du total</TH></TR></THead>
            <TBody>
              {catDep.map((c) => {
                const m = c._sum.montant ?? 0;
                const pct = totalDep ? Math.round((m / totalDep) * 100) : 0;
                return (
                  <TR key={c.categorie}>
                    <TD className="font-medium">{c.categorie}</TD>
                    <TD className="text-right">{formatMoney(m)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        <span className="text-sm w-10">{pct}%</span>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {catDep.length === 0 && <TR><TD colSpan={3} className="text-center py-6 text-muted-foreground">Aucune dépense</TD></TR>}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
