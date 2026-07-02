import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AssuranceForm, AssuranceRow } from "./client";
import { ImportAssurancesButton } from "./import-button";
import { hasPermission } from "@/lib/permissions";

export default async function AssurancesPage() {
  const user = await requireUser();
  const canManage = hasPermission(user.role, user.permissions, "gerer_assurances");

  const assurances = await prisma.assurance.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { factures: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assurances</h1>
          <p className="text-muted-foreground">Compagnies d'assurance partenaires</p>
        </div>
        {canManage && <ImportAssurancesButton />}
      </div>

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Ajouter une assurance</CardTitle></CardHeader>
          <CardContent><AssuranceForm /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Liste ({assurances.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR><TH>Nom</TH><TH>Email</TH><TH className="text-right">Factures</TH>{canManage && <TH></TH>}</TR>
            </THead>
            <TBody>
              {assurances.map((a) => (
                <AssuranceRow key={a.id} assurance={{ id: a.id, nom: a.nom, email: a.email, nbFactures: a._count.factures }} canManage={canManage} />
              ))}
              {assurances.length === 0 && (
                <TR><TD colSpan={4} className="text-center py-8 text-muted-foreground">Aucune assurance</TD></TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
