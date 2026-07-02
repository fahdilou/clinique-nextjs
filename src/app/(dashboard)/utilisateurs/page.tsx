import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UtilisateurForm, UserRow } from "./client";
import { parsePermissions } from "@/lib/permissions";

export default async function UtilisateursPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");

  const users = await prisma.utilisateur.findMany({ orderBy: { nom: "asc" } });
  const enriched = users.map((u) => ({
    id: u.id, nom: u.nom, email: u.email, role: u.role, actif: u.actif ?? 0,
    permissions: [...parsePermissions(u.permissions)],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <p className="text-muted-foreground">Gestion des comptes et permissions</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Nouvel utilisateur</CardTitle></CardHeader>
        <CardContent><UtilisateurForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Liste ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <THead><TR><TH>Nom</TH><TH>Email</TH><TH>Rôle</TH><TH>Statut</TH><TH className="text-right">Actions</TH></TR></THead>
            <TBody>
              {enriched.map((u) => <UserRow key={u.id} user={u} />)}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
