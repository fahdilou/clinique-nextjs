import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BatchDepotSection } from "./client";

export default async function PointGlobalPage() {
  const user = await requireUser();
  if (!hasPermission(user.role, user.permissions, "gerer_depots") && user.role !== "admin") redirect("/dashboard");

  const nonDeposees = await prisma.facture.findMany({
    where: {
      date_depot: null,
      part_assureur: { gt: 0 },
      statut_part_assureur: { notIn: ["N/A", "Soldé"] },
    },
    orderBy: { date_facture: "desc" },
    include: { assurance: true },
    take: 1000,
  });

  const byAssurance = new Map<string, typeof nonDeposees>();
  nonDeposees.forEach((f) => {
    const key = f.assurance?.nom ?? "— Non assignée —";
    if (!byAssurance.has(key)) byAssurance.set(key, []);
    byAssurance.get(key)!.push(f);
  });

  const groups = [...byAssurance.entries()].sort((a, b) =>
    b[1].reduce((s, f) => s + f.montant_total, 0) - a[1].reduce((s, f) => s + f.montant_total, 0)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Point Global — Nouveau Dépôt</h1>
        <p className="text-muted-foreground">
          Sélectionner les factures à envoyer + définir la date de dépôt (groupé par compagnie)
        </p>
      </div>

      {groups.map(([nom, factures]) => (
        <Card key={nom}>
          <CardHeader>
            <CardTitle>{nom}</CardTitle>
            <CardDescription>
              {factures.length} facture(s) sans date de dépôt • Total : {formatMoney(factures.reduce((s, f) => s + f.montant_total, 0))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchDepotSection
              nom={nom}
              factures={factures.map((f) => ({
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
      ))}

      {groups.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">🎉 Toutes les factures assurance ont une date de dépôt.</CardContent></Card>
      )}
    </div>
  );
}
