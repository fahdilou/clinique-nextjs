import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";

export default async function EncaissementIndexPage() {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "encaisser_virements") && user.role !== "admin") redirect("/dashboard");

  // Compter les factures en attente/partiel par compagnie
  const assurances = await prisma.assurance.findMany({
    include: {
      factures: {
        where: {
          date_depot: { not: null },
          part_assureur: { gt: 0 },
          statut_part_assureur: { in: ["En attente", "Payé Partiel"] },
        },
        select: { part_assureur: true, part_assureur_payee: true },
      },
    },
    orderBy: { nom: "asc" },
  });

  const compagnies = assurances
    .map((a) => {
      const reste = a.factures.reduce((s, f) => s + ((f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0)), 0);
      return { id: a.id, nom: a.nom, nb: a.factures.length, reste };
    })
    .filter((c) => c.nb > 0)
    .sort((a, b) => b.reste - a.reste);

  const totalGlobal = compagnies.reduce((s, c) => s + c.reste, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Encaisser les virements</h1>
        <p className="text-muted-foreground">
          Choisissez une compagnie d'assurance pour enregistrer ses paiements
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Compagnies en attente</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{compagnies.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total à percevoir</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{formatMoney(totalGlobal)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Factures déposées</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{compagnies.reduce((s, c) => s + c.nb, 0)}</div></CardContent></Card>
      </div>

      {compagnies.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          🎉 Aucun virement à encaisser. Toutes les factures déposées sont soldées.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {compagnies.map((c) => (
            <Link key={c.id} href={`/encaissement/${c.id}`}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.nom}</div>
                <div className="text-sm text-muted-foreground">
                  <Badge variant="outline" className="mr-2">{c.nb} facture(s)</Badge>
                  <span className="font-medium text-warning">{formatMoney(c.reste)}</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
