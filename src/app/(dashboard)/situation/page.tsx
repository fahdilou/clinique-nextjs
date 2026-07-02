import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ExportButton } from "@/components/export-button";
import { TrendingUp, TrendingDown, Wallet, FileText, Receipt } from "lucide-react";

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default async function SituationGlobalePage({
  searchParams,
}: { searchParams: Promise<{ annee?: string; mois?: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "voir_finances") && user.role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  const annee = sp.annee === "toutes" ? null : (Number(sp.annee) || now.getFullYear());
  const mois = sp.mois === "tous" || !sp.mois ? null : Number(sp.mois);

  let dateStart: Date | null = null;
  let dateEnd: Date | null = null;
  if (annee !== null) {
    if (mois !== null) {
      dateStart = new Date(annee, mois - 1, 1);
      dateEnd = new Date(annee, mois, 1);
    } else {
      dateStart = new Date(annee, 0, 1);
      dateEnd = new Date(annee + 1, 0, 1);
    }
  }

  const factWhere = dateStart ? { date_facture: { gte: dateStart, lt: dateEnd! } } : {};
  const depWhere = dateStart ? { date_depense: { gte: dateStart, lt: dateEnd! } } : {};

  const [factAgg, depAgg] = await Promise.all([
    prisma.facture.aggregate({
      where: factWhere,
      _sum: { montant_total: true, part_assure: true, part_assureur: true, part_assureur_payee: true },
      _count: true,
    }),
    prisma.depense.aggregate({ where: depWhere, _sum: { montant: true }, _count: true }),
  ]);

  const caTotal = factAgg._sum.montant_total ?? 0;
  const caisse = factAgg._sum.part_assure ?? 0;
  const assurDu = factAgg._sum.part_assureur ?? 0;
  const assurPaye = factAgg._sum.part_assureur_payee ?? 0;
  const resteAssur = assurDu - assurPaye;
  const totalEncaisse = caisse + assurPaye;
  const totalDepenses = depAgg._sum.montant ?? 0;
  const beneficeReel = totalEncaisse - totalDepenses;
  const beneficeTheorique = caTotal - totalDepenses;

  // Années disponibles
  const anneesRaw = await prisma.$queryRaw<{ y: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM date_facture)::int AS y FROM factures ORDER BY y DESC
  `;
  const annees = anneesRaw.map((a) => a.y);
  if (annees.length === 0) annees.push(now.getFullYear());

  const libellePeriode = annee === null
    ? "Depuis le début"
    : mois === null
      ? `Année ${annee}`
      : `${MOIS_FR[mois - 1]} ${annee}`;

  const exportUrl = `/api/export/situation?annee=${annee ?? "toutes"}&mois=${mois ?? "tous"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Situation Globale Clinique</h1>
          <p className="text-muted-foreground">{libellePeriode}</p>
        </div>
        <div className="flex gap-2">
          <form action="/situation" className="flex gap-2">
            <select name="annee" defaultValue={annee ?? "toutes"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="toutes">Toutes années</option>
              {annees.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select name="mois" defaultValue={mois ?? "tous"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="tous">Tous mois</option>
              {MOIS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <button className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground">Filtrer</button>
          </form>
          <ExportButton endpoint={exportUrl} filename={`situation_${libellePeriode.replace(/\s/g, "_")}.xlsx`} />
        </div>
      </div>

      {/* 4 KPIs globaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="CA total facturé" value={formatMoney(caTotal)} icon={FileText} color="text-primary" sub={`${factAgg._count} facture(s)`} />
        <Kpi label="Total encaissé" value={formatMoney(totalEncaisse)} icon={Wallet} color="text-success" sub={`Caisse + Virements`} />
        <Kpi label="Total dépenses" value={formatMoney(totalDepenses)} icon={Receipt} color="text-destructive" sub={`${depAgg._count} dépense(s)`} />
        <Kpi
          label="Bénéfice net réel"
          value={formatMoney(beneficeReel)}
          icon={beneficeReel >= 0 ? TrendingUp : TrendingDown}
          color={beneficeReel >= 0 ? "text-success" : "text-destructive"}
          sub={`Théorique (CA-Dép): ${formatMoney(beneficeTheorique)}`}
        />
      </div>

      {/* Synthèse détaillée */}
      <Card>
        <CardHeader><CardTitle>Synthèse financière</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-primary border-b pb-2">📊 Recettes</h3>
              <Ligne label="CA total facturé" value={caTotal} />
              <Ligne label="Part encaissée à la caisse (patients)" value={caisse} color="success" />
              <Ligne label="Part assureur (facturé)" value={assurDu} />
              <Ligne label="Part assureur (déjà perçue)" value={assurPaye} color="success" />
              <Ligne label="Reste à percevoir assurances" value={resteAssur} color="warning" />
              <div className="pt-3 border-t-2">
                <Ligne label="TOTAL ENCAISSÉ" value={totalEncaisse} bold color="success" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-destructive border-b pb-2">💸 Dépenses & Résultat</h3>
              <Ligne label="Total dépenses" value={totalDepenses} color="destructive" />
              <div className="pt-3 border-t-2">
                <Ligne label="BÉNÉFICE NET RÉEL" value={beneficeReel} bold color={beneficeReel >= 0 ? "success" : "destructive"} />
                <p className="text-xs text-muted-foreground mt-1">= Total encaissé − Dépenses</p>
              </div>
              <div className="pt-3">
                <Ligne label="Résultat théorique" value={beneficeTheorique} color={beneficeTheorique >= 0 ? "success" : "destructive"} />
                <p className="text-xs text-muted-foreground mt-1">= CA facturé − Dépenses (si tout était encaissé)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Répartition */}
      <Card>
        <CardHeader><CardTitle>Répartition du CA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {caTotal > 0 && (
            <>
              <Barre label="Caisse (payé cash par patients)" value={caisse} total={caTotal} color="bg-success" />
              <Barre label="Assurance déjà perçue" value={assurPaye} total={caTotal} color="bg-primary" />
              <Barre label="Assurance en attente" value={resteAssur} total={caTotal} color="bg-warning" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Ligne({ label, value, color, bold }: {
  label: string; value: number; color?: "success" | "warning" | "destructive"; bold?: boolean;
}) {
  const cls = color === "success" ? "text-success" : color === "warning" ? "text-warning" : color === "destructive" ? "text-destructive" : "";
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sm ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${bold ? "text-lg font-bold" : "text-sm font-medium"} ${cls}`}>{formatMoney(value)}</span>
    </div>
  );
}

function Barre({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{formatMoney(value)} <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
