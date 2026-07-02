import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  Landmark, Send, FileText, Package, ArrowRight, Activity, Clock,
} from "lucide-react";
import { MonthlyRevenueChart, ExpensesByCategoryChart } from "./charts-wrapper";

export default async function DashboardPage() {
  const user = await requireUser();
  const canFin = hasPermission(user.role, user.permissions, "voir_finances");

  if (!canFin) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Bienvenue {user.nom}</h1>
          <p className="text-muted-foreground">Vous n'avez pas l'accès aux données financières.</p></div>
      </div>
    );
  }

  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue {user.nom} — vue globale au {new Date().toLocaleDateString("fr-FR")}</p>
      </div>

      {/* 🎯 4 KPIs principaux avec tendance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiMain
          label={`Chiffre d'affaires ${d.anneeCourante}`}
          value={formatMoney(d.caAnnee)}
          trend={d.evolAnnee}
          sub="Total facturé cette année"
          color="primary"
        />
        <KpiMain
          label="Trésorerie encaissée"
          value={formatMoney(d.encaisseAnnee)}
          sub={`Caisse + virements ${d.anneeCourante}`}
          color="success"
          icon={Wallet}
        />
        <KpiMain
          label="Bénéfice net"
          value={formatMoney(d.beneficeAnnee)}
          trend={d.beneficeLastYear > 0 ? Math.round(((d.beneficeAnnee - d.beneficeLastYear) / Math.abs(d.beneficeLastYear)) * 100) : null}
          sub={`Marge : ${d.margeAnnee}%`}
          color={d.beneficeAnnee >= 0 ? "success" : "destructive"}
          icon={d.beneficeAnnee >= 0 ? TrendingUp : TrendingDown}
        />
        <KpiMain
          label="Reste à percevoir"
          value={formatMoney(d.resteRecevoir)}
          sub={`Attente ~${d.moyenneJoursAttente}j en moyenne`}
          color="warning"
          icon={Clock}
        />
      </div>

      {/* 🚨 Actions urgentes */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Factures en retard"
          count={d.alertes.retards30j}
          amount={d.alertes.retardsMontant}
          hint={d.alertes.retards60j > 0 ? `⚠️ ${d.alertes.retards60j} > 60 jours` : "Générer des lettres de relance"}
          href="/relances"
          icon={Send}
          color={d.alertes.retards30j > 0 ? "destructive" : "muted"}
          cta="Voir les relances"
        />
        <ActionCard
          title="Virements à encaisser"
          count={d.alertes.aEncaisserNb}
          amount={d.alertes.aEncaisserMontant}
          hint="Factures déposées, en attente de paiement"
          href="/encaissement"
          icon={Landmark}
          color={d.alertes.aEncaisserNb > 0 ? "warning" : "muted"}
          cta="Aller encaisser"
        />
        <ActionCard
          title="Factures à déposer"
          count={d.alertes.aDeposerNb}
          amount={d.alertes.aDeposerMontant}
          hint="Pas encore envoyées aux assurances"
          href="/point-global"
          icon={FileText}
          color={d.alertes.aDeposerNb > 20 ? "warning" : "muted"}
          cta="Point Global"
        />
      </div>

      {/* 📊 Indicateurs de santé */}
      <div className="grid gap-4 md:grid-cols-3">
        <HealthCard
          label="Taux de recouvrement"
          value={d.tauxRecouvrement}
          suffix="%"
          target={80}
          hint="Assurance perçue / facturée (global)"
        />
        <HealthCard
          label="Marge bénéficiaire annuelle"
          value={d.margeAnnee}
          suffix="%"
          target={20}
          hint={`Bénéfice / CA ${d.anneeCourante}`}
        />
        <HealthCard
          label="Encaissé ce mois"
          value={d.encaisseMois}
          formatFn={formatMoney}
          hint={d.encaisseLastMonth > 0 && d.encaisseMois > 0
            ? `${d.encaisseMois > d.encaisseLastMonth ? "↑" : "↓"} ${Math.abs(Math.round(((d.encaisseMois - d.encaisseLastMonth) / d.encaisseLastMonth) * 100))}% vs ${new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString("fr-FR", { month: "long" })}`
            : `Mois de ${d.moisCourant}`}
        />
      </div>

      {/* 📈 Graphiques */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Évolution CA vs Encaissé (12 mois)</CardTitle></CardHeader>
          <CardContent><MonthlyRevenueChart data={d.chartData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dépenses du mois</CardTitle></CardHeader>
          <CardContent>
            {d.depByCat.length > 0
              ? <ExpensesByCategoryChart data={d.depByCat} />
              : <p className="text-center py-12 text-sm text-muted-foreground">Aucune dépense enregistrée en {d.moisCourant}</p>}
          </CardContent>
        </Card>
      </div>

      {/* 🏢 Top compagnies + stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Compagnies — top 5 dettes</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/analyses">Voir tout <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <Table>
              <THead><TR><TH>Compagnie</TH><TH className="text-right">Facturé</TH><TH className="text-right">Reste</TH><TH className="w-32">Recouvrement</TH></TR></THead>
              <TBody>
                {d.compagnies.slice(0, 5).map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.nom}</TD>
                    <TD className="text-right text-sm">{formatMoney(c.total)}</TD>
                    <TD className="text-right text-sm text-destructive">{formatMoney(c.reste)}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${c.taux >= 80 ? "bg-success" : c.taux >= 50 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${c.taux}%` }} />
                        </div>
                        <span className="text-xs w-8 text-right">{c.taux}%</span>
                      </div>
                    </TD>
                  </TR>
                ))}
                {d.compagnies.length === 0 && <TR><TD colSpan={4} className="text-center py-6 text-muted-foreground">Aucune donnée</TD></TR>}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" /> Stock</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/stock">Voir <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <StockLine label="Produits actifs" value={d.stock.actifs} icon="🟢" />
            <StockLine label="Alertes seuil" value={d.stock.alertes} icon="🟠" color={d.stock.alertes > 0 ? "warning" : undefined} />
            <StockLine label="Ruptures" value={d.stock.ruptures} icon="🔴" color={d.stock.ruptures > 0 ? "destructive" : undefined} />
            <div className="pt-3 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">Valeur totale</div>
              <div className="text-2xl font-bold">{formatMoney(d.stock.valeur)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiMain({ label, value, trend, sub, color, icon: Icon }: {
  label: string; value: string; trend?: number | null; sub?: string;
  color: "primary" | "success" | "warning" | "destructive";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const colorMap = {
    primary: "border-l-primary",
    success: "border-l-success",
    warning: "border-l-warning",
    destructive: "border-l-destructive",
  };
  const IconComp = Icon ?? Activity;
  return (
    <Card className={`border-l-4 ${colorMap[color]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
        <IconComp className={`h-4 w-4 text-${color === "primary" ? "primary" : color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend !== null && trend !== undefined) && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? "text-success" : "text-destructive"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend > 0 ? "+" : ""}{trend}% <span className="text-muted-foreground">vs période précédente</span>
          </div>
        )}
        {sub && !trend && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, count, amount, hint, href, icon: Icon, color, cta }: {
  title: string; count: number; amount: number; hint: string; href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "destructive" | "warning" | "muted"; cta: string;
}) {
  const colorMap = {
    destructive: { bg: "bg-destructive/10", text: "text-destructive", icon: "text-destructive" },
    warning: { bg: "bg-warning/10", text: "text-warning", icon: "text-warning" },
    muted: { bg: "bg-muted", text: "text-muted-foreground", icon: "text-muted-foreground" },
  };
  const c = colorMap[color];
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
            <div className={`text-3xl font-bold mt-1 ${c.text}`}>{count}</div>
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${c.bg}`}>
            <Icon className={`h-6 w-6 ${c.icon}`} />
          </div>
        </div>
        {amount > 0 && <div className="text-sm mb-1 font-medium">{formatMoney(amount)}</div>}
        <div className="text-xs text-muted-foreground mb-3">{hint}</div>
        <Button asChild variant={count > 0 ? "default" : "outline"} size="sm" className="w-full">
          <Link href={href}>{cta} <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function HealthCard({ label, value, suffix, target, hint, formatFn }: {
  label: string; value: number; suffix?: string; target?: number; hint?: string; formatFn?: (v: number) => string;
}) {
  const displayed = formatFn ? formatFn(value) : `${value}${suffix ?? ""}`;
  const status = target !== undefined
    ? value >= target ? "success" : value >= target * 0.6 ? "warning" : "destructive"
    : "primary";
  const colorMap = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    primary: "bg-primary text-primary-foreground",
  };
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          {target !== undefined && (
            <Badge className={colorMap[status]}>
              {value >= target ? "✓ Objectif" : `${Math.round((value / target) * 100)}% de l'objectif`}
            </Badge>
          )}
        </div>
        <div className="text-3xl font-bold">{displayed}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {target !== undefined && (
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all ${status === "success" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockLine({ label, value, icon, color }: { label: string; value: number; icon: string; color?: "warning" | "destructive" }) {
  const c = color === "destructive" ? "text-destructive" : color === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2 text-sm">
        <span>{icon}</span>{label}
      </div>
      <div className={`font-bold ${c}`}>{value}</div>
    </div>
  );
}
