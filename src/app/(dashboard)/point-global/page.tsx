import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";

export default async function PointGlobalIndexPage() {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "gerer_depots") && user.role !== "admin") redirect("/dashboard");

  const assurances = await prisma.assurance.findMany({
    include: {
      factures: {
        where: {
          date_depot: null,
          part_assureur: { gt: 0 },
          statut_part_assureur: { notIn: ["N/A", "Soldé"] },
        },
        select: { montant_total: true, part_assureur: true },
      },
    },
    orderBy: { nom: "asc" },
  });

  const compagnies = assurances
    .filter((a) => a.nom !== "SANS ASSURANCE")
    .map((a) => {
      const totalMontant = a.factures.reduce((s, f) => s + f.montant_total, 0);
      const totalAssureur = a.factures.reduce((s, f) => s + (f.part_assureur ?? 0), 0);
      return { id: a.id, nom: a.nom, nb: a.factures.length, totalMontant, totalAssureur };
    })
    .filter((c) => c.nb > 0)
    .sort((a, b) => b.totalAssureur - a.totalAssureur);

  const totalGlobal = compagnies.reduce((s, c) => s + c.totalAssureur, 0);
  const totalFactures = compagnies.reduce((s, c) => s + c.nb, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Point Global — Nouveau Dépôt</h1>
        <p className="text-muted-foreground">
          Choisissez une compagnie d'assurance pour déposer un lot de factures
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Compagnies à déposer</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{compagnies.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Factures en attente</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalFactures}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total part assureur</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{formatMoney(totalGlobal)}</div></CardContent></Card>
      </div>

      {compagnies.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          🎉 Toutes les factures assurance ont une date de dépôt.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {compagnies.map((c) => (
            <Link key={c.id} href={`/point-global/${c.id}`}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-primary hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.nom}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className="mr-2">{c.nb} facture(s)</Badge>
                  <span className="font-medium text-warning">{formatMoney(c.totalAssureur)}</span>
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
