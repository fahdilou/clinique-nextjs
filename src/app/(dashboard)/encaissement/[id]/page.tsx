import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EncaissementCie } from "../client";

export default async function EncaissementCiePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "encaisser_virements") && user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const assurance = await prisma.assurance.findUnique({
    where: { id: Number(id) },
    include: {
      factures: {
        where: {
          date_depot: { not: null },
          part_assureur: { gt: 0 },
          statut_part_assureur: { in: ["En attente", "Payé Partiel"] },
        },
        orderBy: [{ date_depot: "asc" }, { date_facture: "asc" }],
      },
    },
  });

  if (!assurance) notFound();

  const totalDu = assurance.factures.reduce((s, f) => s + ((f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/encaissement"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{assurance.nom}</h1>
          <p className="text-muted-foreground">
            {assurance.factures.length} facture(s) déposée(s) • Reste à percevoir : <span className="font-semibold text-warning">{formatMoney(totalDu)}</span>
          </p>
        </div>
      </div>

      {assurance.factures.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Aucune facture en attente pour cette compagnie.
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner et valider les paiements reçus</CardTitle>
            <CardDescription>
              Cochez les factures encaissées, ajustez le montant reçu, précisez un motif si écart, puis validez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EncaissementCie
              factures={assurance.factures.map((f) => ({
                id: f.id,
                num_facture: f.num_facture,
                date_facture: f.date_facture.toISOString(),
                date_depot: f.date_depot?.toISOString() ?? null,
                part_assureur: f.part_assureur ?? 0,
                part_assureur_payee: f.part_assureur_payee ?? 0,
                statut: f.statut_part_assureur ?? "En attente",
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
