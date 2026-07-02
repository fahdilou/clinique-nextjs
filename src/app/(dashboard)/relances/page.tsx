import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDate } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { FileText, Mail, Printer } from "lucide-react";
import Link from "next/link";

export default async function RelancesPage() {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "voir_finances") && user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const limit30j = new Date(now.getTime() - 30 * 86400_000);
  const limit60j = new Date(now.getTime() - 60 * 86400_000);

  const enRetard = await prisma.facture.findMany({
    where: {
      statut_part_assureur: { notIn: ["Soldé", "Payée", "N/A"] },
      date_facture: { lte: limit30j },
      part_assureur: { gt: 0 },
    },
    include: { assurance: true },
    orderBy: { date_facture: "asc" },
  });

  const byAssurance = new Map<number, { assurance: { id: number; nom: string; email: string | null }; factures: typeof enRetard; total: number }>();
  enRetard.forEach((f) => {
    if (!f.assurance) return;
    const key = f.assurance.id;
    if (!byAssurance.has(key)) byAssurance.set(key, { assurance: f.assurance, factures: [], total: 0 });
    const e = byAssurance.get(key)!;
    e.factures.push(f);
    e.total += (f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0);
  });

  const groups = [...byAssurance.values()].sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Relances Assurances</h1>
          <p className="text-muted-foreground">Factures en retard (&gt; 30 jours) — générer des lettres de relance</p>
        </div>
        {groups.length > 0 && (
          <Button asChild variant="default"><Link href="/api/relance/bulk" target="_blank">
            <Printer className="h-4 w-4" /> Générer toutes les lettres ({groups.length})
          </Link></Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Compagnies concernées</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{groups.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Factures en retard</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{enRetard.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total à recouvrer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{formatMoney(groups.reduce((s, g) => s + g.total, 0))}</div></CardContent></Card>
      </div>

      {groups.map((g) => {
        const critique = g.factures.some((f) => f.date_facture <= limit60j);
        return (
          <Card key={g.assurance.id}>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {g.assurance.nom}
                    {critique && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Critique &gt;60j</span>}
                  </CardTitle>
                  <CardDescription>
                    {g.assurance.email ?? "Email manquant"} • {g.factures.length} facture(s) • Reste : {formatMoney(g.total)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline"><Link href={`/api/relance/${g.assurance.id}`} target="_blank"><FileText className="h-4 w-4" /> Lettre imprimable</Link></Button>
                  {g.assurance.email && (
                    <Button asChild>
                      <a href={`mailto:${g.assurance.email}?subject=${encodeURIComponent(`Relance factures — ${g.factures.length} en attente`)}&body=${encodeURIComponent(`Bonjour,\n\nNous vous informons que ${g.factures.length} facture(s) restent en attente de règlement pour un total de ${formatMoney(g.total)}.\n\nMerci de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,`)}`}>
                        <Mail className="h-4 w-4" /> Envoyer email
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <THead><TR><TH>Date</TH><TH>N°</TH><TH className="text-right">Assureur</TH><TH className="text-right">Payé</TH><TH className="text-right">Reste</TH><TH>Ancienneté</TH></TR></THead>
                <TBody>
                  {g.factures.slice(0, 8).map((f) => {
                    const jours = Math.floor((now.getTime() - f.date_facture.getTime()) / 86400_000);
                    const reste = (f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0);
                    return (
                      <TR key={f.id}>
                        <TD>{formatDate(f.date_facture)}</TD>
                        <TD className="font-medium">{f.num_facture}</TD>
                        <TD className="text-right">{formatMoney(f.part_assureur)}</TD>
                        <TD className="text-right">{formatMoney(f.part_assureur_payee)}</TD>
                        <TD className="text-right font-semibold text-destructive">{formatMoney(reste)}</TD>
                        <TD className="text-sm text-muted-foreground">{jours} jours</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              {g.factures.length > 8 && <p className="text-xs text-muted-foreground mt-2">Et {g.factures.length - 8} autres factures…</p>}
            </CardContent>
          </Card>
        );
      })}

      {groups.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune facture en retard. 🎉</CardContent></Card>
      )}
    </div>
  );
}
