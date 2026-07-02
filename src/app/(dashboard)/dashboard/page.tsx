import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import {
  FileText, Wallet, Receipt, TrendingDown, AlertTriangle, Package,
  TrendingUp, PiggyBank,
} from "lucide-react";
import { MonthlyRevenueChart, ExpensesByCategoryChart, InsuranceDebtChart } from "./charts-wrapper";

export default async function DashboardPage() {
  const user = await requireUser();
  const canFin = hasPermission(user.role, user.permissions, "voir_finances");
  const d = await getDashboardData();

  const beneficeMois = d.encaisseMois - d.depMois;
  const beneficeAnnee = d.encaisseAnnee - d.depAnnee;
  const debtChart = d.compagnies.filter((c) => c.reste > 0).slice(0, 8).map((c) => ({ nom: c.nom, reste: c.reste }));

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi label="CA facturé (mois)" value={formatMoney(d.caMois)} icon={FileText} color="text-primary" />
            <Kpi label="Encaissé caisse (mois)" value={formatMoney(d.caisseMois)} icon={Wallet} color="text-success" />
            <Kpi label="En attente assurance" value={formatMoney(d.attenteMois)} icon={AlertTriangle} color="text-warning" />
            <Kpi label="Dépenses (mois)" value={formatMoney(d.depMois)} icon={TrendingDown} color="text-destructive" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Encaissé total mois" value={formatMoney(d.encaisseMois)} icon={PiggyBank} color="text-success" />
            <Kpi label="Bénéfice net (mois)" value={formatMoney(beneficeMois)}
              icon={beneficeMois >= 0 ? TrendingUp : TrendingDown}
              color={beneficeMois >= 0 ? "text-success" : "text-destructive"} />
            <Kpi label="Encaissé total (année)" value={formatMoney(d.encaisseAnnee)} icon={PiggyBank} color="text-success" />
            <Kpi label="Bénéfice net (année)" value={formatMoney(beneficeAnnee)} icon={TrendingUp}
              color={beneficeAnnee >= 0 ? "text-success" : "text-destructive"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Kpi label="CA facturé (année)" value={formatMoney(d.caAnnee)} icon={FileText} color="text-primary" />
            <Kpi label="Dépenses (année)" value={formatMoney(d.depAnnee)} icon={Receipt} color="text-muted-foreground" />
            <Kpi label="Encaissé assurance (mois)" value={formatMoney(d.assurPayeeMois)} icon={Wallet} color="text-success" />
            <Kpi label="Factures en retard (>30j)" value={d.retards.toString()} icon={AlertTriangle} color="text-warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Évolution 12 derniers mois</CardTitle></CardHeader>
              <CardContent><MonthlyRevenueChart data={d.chartData} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Dépenses du mois par catégorie</CardTitle></CardHeader>
              <CardContent>
                {d.depByCat.length > 0 ? <ExpensesByCategoryChart data={d.depByCat} />
                  : <p className="text-center py-8 text-muted-foreground">Aucune dépense ce mois</p>}
              </CardContent>
            </Card>
          </div>

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
                    {d.compagnies.slice(0, 10).map((a) => (
                      <TR key={a.id}>
                        <TD className="font-medium">{a.nom}</TD>
                        <TD className="text-right text-sm">{formatMoney(a.total)}</TD>
                        <TD className="text-right text-sm text-destructive">{formatMoney(a.reste)}</TD>
                        <TD><Badge variant={a.taux >= 80 ? "success" : a.taux >= 50 ? "warning" : "destructive"}>{a.taux}%</Badge></TD>
                      </TR>
                    ))}
                    {d.compagnies.length === 0 && <TR><TD colSpan={4} className="text-center py-6 text-muted-foreground">Aucune donnée</TD></TR>}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Produits actifs" value={d.stockActifs.toString()} icon={Package} color="text-primary" />
        <Kpi label="Alertes seuil" value={d.alertesStock.toString()} icon={AlertTriangle} color="text-warning" />
        <Kpi label="Total factures" value={d.nbTotalFactures.toString()} icon={FileText} color="text-muted-foreground" />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }: {
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
