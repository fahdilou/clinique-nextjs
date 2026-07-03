import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BatchDepotSection } from "../client";

export default async function PointGlobalCiePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "gerer_depots") && user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const assurance = await prisma.assurance.findUnique({
    where: { id: Number(id) },
    include: {
      factures: {
        where: {
          date_depot: null,
          part_assureur: { gt: 0 },
          statut_part_assureur: { notIn: ["N/A", "Soldé"] },
        },
        orderBy: { date_facture: "asc" },
      },
    },
  });

  if (!assurance) notFound();

  const totalMontant = assurance.factures.reduce((s, f) => s + f.montant_total, 0);
  const totalAssureur = assurance.factures.reduce((s, f) => s + (f.part_assureur ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/point-global"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{assurance.nom}</h1>
          <p className="text-muted-foreground">
            {assurance.factures.length} facture(s) en attente de dépôt •
            Montant total : <span className="font-semibold">{formatMoney(totalMontant)}</span> •
            Part assureur : <span className="font-semibold text-warning">{formatMoney(totalAssureur)}</span>
          </p>
        </div>
      </div>

      {assurance.factures.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Aucune facture en attente de dépôt pour cette compagnie.
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sélectionner les factures à envoyer</CardTitle>
            <CardDescription>
              Cochez les factures faisant partie du dépôt, indiquez la date d'envoi, puis validez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchDepotSection
              nom={assurance.nom}
              factures={assurance.factures.map((f) => ({
                id: f.id,
                num_facture: f.num_facture,
                date_facture: f.date_facture.toISOString(),
                montant_total: f.montant_total,
                part_assureur: f.part_assureur ?? 0,
                statut_part_assureur: f.statut_part_assureur,
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
