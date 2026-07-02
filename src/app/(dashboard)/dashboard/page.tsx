import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import {
  FileText, Wallet, Receipt, TrendingDown, AlertTriangle, Package,
  TrendingUp, PiggyBank,
} from "lucide-react";
import { MonthlyRevenueChart, ExpensesByCategoryChart, InsuranceDebtChart } from "./charts";

export default async function DashboardPage() {
  const user = await requireUser();
  const canFin = hasPermission(user.role, user.permissions, "voir_finances");

  const now = new Date();
  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayYear = new Date(now.getFullYear(), 0, 1);
  const dateLimit30j = new Date(now.getTime() - 30 * 86400_000);

  const start12mo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalFactures, factMonth, caisseMonth, assureurMonth, assurPayeeMonth,
    factYear, caisseYear, assurPayeeYear,
    depMonth, depYear, retards,
    stockCount, alertesRupture, valeurStock,
    monthlyRaw, depByCat, insuranceStats,
  ] = await Promise.all([
    prisma.facture.count(),
    // CA total du mois
    prisma.facture.aggregate({ _sum: { montant_total: true }, where: { date_facture: { gte: firstDayMonth } } }),
    // Encaissé caisse (part patient, cash immédiat)
    prisma.facture.aggregate({ _sum: { part_assure: true }, where: { date_facture: { gte: firstDayMonth } } }),
    // Part assureur (facturé aux compagnies)
    prisma.facture.aggregate({ _sum: { part_assureur: true }, where: { date_facture: { gte: firstDayMonth } } }),
    // Payé par assureur (déjà encaissé virements)
    prisma.facture.aggregate({ _sum: { part_assureur_payee: true }, where: { date_facture: { gte: firstDayMonth } } }),
    // Année
    prisma.facture.aggregate({ _sum: { montant_total: true }, where: { date_facture: { gte: firstDayYear } } }),
    prisma.facture.aggregate({ _sum: { part_assure: true }, where: { date_facture: { gte: firstDayYear } } }),
    prisma.facture.aggregate({ _sum: { part_assureur_payee: true }, where: { date_facture: { gte: firstDayYear } } }),
    prisma.depense.aggregate({ _sum: { montant: true }, where: { date_depense: { gte: firstDayMonth } } }),
    prisma.depense.aggregate({ _sum: { montant: true }, where: { date_depense: { gte: firstDayYear } } }),
    prisma.facture.count({
      where: {
        statut_part_assureur: { notIn: ["Payée", "Soldé", "N/A"] },
        date_facture: { lte: dateLimit30j },
        part_assureur: { gt: 0 },
      },
    }),
    prisma.produit.count({ where: { actif: 1 } }),
    prisma.produit.count({ where: { actif: 1, stock_initial: { lte: 5 } } }),
    prisma.produit.aggregate({ _sum: { stock_initial: true }, where: { actif: 1 } }),
    // 12 derniers mois : CA vs encaissé caisse (part_assure = cash immédiat)
    prisma.$queryRaw<{ mois: Date; factures: number; encaisse: number }[]>`
      SELECT
        date_trunc('month', date_facture) AS mois,
        COALESCE(SUM(montant_total), 0)::float AS factures,
        COALESCE(SUM(part_assure + part_assureur_payee), 0)::float AS encaisse
      FROM factures
      WHERE date_facture >= ${start12mo}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    // Dépenses par catégorie (mois en cours)
    prisma.depense.groupBy({
      by: ["categorie"],
      where: { date_depense: { gte: firstDayMonth } },
      _sum: { montant: true },
      orderBy: { _sum: { montant: "desc" } },
    }),
    // Analyse par compagnie d'assurance
    prisma.assurance.findMany({
      include: {
        factures: {
          select: { montant_total: true, part_assureur: true, part_assureur_payee: true },
        },
      },
    }),
  ]);

  // Encaissé total = caisse (immédiat) + versements assurance
  const encaisseMois = (caisseMonth._sum.part_assure ?? 0) + (assurPayeeMonth._sum.part_assureur_payee ?? 0);
  const encaisseAnnee = (caisseYear._sum.part_assure ?? 0) + (assurPayeeYear._sum.part_assureur_payee ?? 0);
  const attenteMois = (assureurMonth._sum.part_assureur ?? 0) - (assurPayeeMonth._sum.part_assureur_payee ?? 0);
  const beneficeMois = encaisseMois - (depMonth._sum.montant ?? 0);
  const beneficeAnnee = encaisseAnnee - (depYear._sum.montant ?? 0);

  const assCompagnies = insuranceStats
    .map((a) => {
      const total = a.factures.reduce((s, f) => s + (f.part_assureur ?? 0), 0);
      const paye = a.factures.reduce((s, f) => s + (f.part_assureur_payee ?? 0), 0);
      const reste = total - paye;
      const taux = total ? Math.round((paye / total) * 100) : 0;
      return { id: a.id, nom: a.nom, nbFactures: a.factures.length, total, paye, reste, taux };
    })
    .filter((a) => a.nbFactures > 0)
    .sort((a, b) => b.reste - a.reste);

  const debtChart = assCompagnies.filter((a) => a.reste > 0).slice(0, 8).map((a) => ({ nom: a.nom, reste: a.reste }));

  const depCatData = depByCat.map((d) => ({ categorie: d.categorie, montant: d._sum.montant ?? 0 })).filter((d) => d.montant > 0);

  // Remplir tous les 12 mois (même les vides) pour le graphique
  const chartData: { mois: string; factures: number; encaisse: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const found = monthlyRaw.find((m) => new Date(m.mois).getMonth() === d.getMonth() && new Date(m.mois).getFullYear() === d.getFullYear());
    chartData.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      factures: found?.factures ?? 0,
      encaisse: found?.encaisse ?? 0,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue {user.nom} — vue globale de la clinique</p>
      </div>

      {!canFin ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Vous n'avez pas l'accès aux données financières.
        </CardContent></Card>
      ) : (
        <>
          {/* KPIs principaux du mois */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="CA facturé (mois)" value={formatMoney(factMonth._sum.montant_total)} icon={FileText} color="text-primary" />
            <KpiCard label="Encaissé caisse (mois)" value={formatMoney(caisseMonth._sum.part_assure)} icon={Wallet} color="text-success" />
            <KpiCard label="En attente assurance" value={formatMoney(attenteMois)} icon={AlertTriangle} color="text-warning" />
            <KpiCard label="Dépenses (mois)" value={formatMoney(depMonth._sum.montant)} icon={TrendingDown} color="text-destructive" />
          </div>

          {/* Bilan mois + année */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Encaissé total mois" value={formatMoney(encaisseMois)} icon={PiggyBank} color="text-success" />
            <KpiCard
              label="Bénéfice net (mois)"
              value={formatMoney(beneficeMois)}
              icon={beneficeMois >= 0 ? TrendingUp : TrendingDown}
              color={beneficeMois >= 0 ? "text-success" : "text-destructive"}
            />
            <KpiCard label="Encaissé total (année)" value={formatMoney(encaisseAnnee)} icon={PiggyBank} color="text-success" />
            <KpiCard label="Bénéfice net (année)" value={formatMoney(beneficeAnnee)} icon={TrendingUp} color={beneficeAnnee >= 0 ? "text-success" : "text-destructive"} />
          </div>

          {/* Alertes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="CA facturé (année)" value={formatMoney(factYear._sum.montant_total)} icon={FileText} color="text-primary" />
            <KpiCard label="Dépenses (année)" value={formatMoney(depYear._sum.montant)} icon={Receipt} color="text-muted-foreground" />
            <KpiCard label="Encaissé assurance (mois)" value={formatMoney(assurPayeeMonth._sum.part_assureur_payee)} icon={Wallet} color="text-success" />
            <KpiCard label="Factures en retard (>30j)" value={retards.toString()} icon={AlertTriangle} color="text-warning" />
          </div>

          {/* Graphiques */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Évolution 12 derniers mois</CardTitle></CardHeader>
              <CardContent><MonthlyRevenueChart data={chartData} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dépenses du mois par catégorie</CardTitle></CardHeader>
              <CardContent>
                {depCatData.length > 0 ? <ExpensesByCategoryChart data={depCatData} />
                  : <p className="text-center py-8 text-muted-foreground">Aucune dépense ce mois</p>}
              </CardContent>
            </Card>
          </div>

          {/* Dette par compagnie */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Dette par compagnie (top 8)</CardTitle></CardHeader>
              <CardContent>
                {debtChart.length > 0 ? <InsuranceDebtChart data={debtChart} />
                  : <p className="text-center py-8 text-muted-foreground">Aucune dette en cours</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Performance par compagnie</CardTitle></CardHeader>
              <CardContent className="overflow-auto max-h-[360px]">
                <Table>
                  <THead><TR><TH>Compagnie</TH><TH className="text-right">Émis</TH><TH className="text-right">Reste</TH><TH>Recouvrement</TH></TR></THead>
                  <TBody>
                    {assCompagnies.slice(0, 10).map((a) => (
                      <TR key={a.id}>
                        <TD className="font-medium">{a.nom}</TD>
                        <TD className="text-right text-sm">{formatMoney(a.total)}</TD>
                        <TD className="text-right text-sm text-destructive">{formatMoney(a.reste)}</TD>
                        <TD>
                          <Badge variant={a.taux >= 80 ? "success" : a.taux >= 50 ? "warning" : "destructive"}>{a.taux}%</Badge>
                        </TD>
                      </TR>
                    ))}
                    {assCompagnies.length === 0 && <TR><TD colSpan={4} className="text-center py-6 text-muted-foreground">Aucune donnée</TD></TR>}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Stock */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Produits actifs" value={stockCount.toString()} icon={Package} color="text-primary" />
        <KpiCard label="Alertes seuil" value={alertesRupture.toString()} icon={AlertTriangle} color="text-warning" />
        <KpiCard label="Total factures" value={totalFactures.toString()} icon={FileText} color="text-muted-foreground" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}
