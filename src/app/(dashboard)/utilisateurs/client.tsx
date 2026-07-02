"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TR, TD } from "@/components/ui/table";
import { createUtilisateur, updateUtilisateur, deleteUtilisateur, resetPassword, resetPermissionsRole } from "@/lib/actions/utilisateurs";
import { ROLES, TOUTES_PERMISSIONS, LABELS_PERMISSIONS, PERMISSIONS_PAR_ROLE } from "@/lib/permissions";
import { Pencil, Trash2, Key, X, Save, RotateCcw } from "lucide-react";

export function UtilisateurForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-4 gap-3"
      id="user-form"
      action={(fd) => start(async () => {
        try { await createUtilisateur(fd); (document.getElementById("user-form") as HTMLFormElement)?.reset(); setErr(null); }
        catch (e: any) { setErr(e?.message ?? "Erreur"); }
      })}
    >
      <div className="space-y-1.5"><Label>Nom complet</Label><Input name="nom" required /></div>
      <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
      <div className="space-y-1.5"><Label>Mot de passe</Label><Input name="password" type="password" required minLength={8} /></div>
      <div className="space-y-1.5">
        <Label>Rôle</Label>
        <Select name="role" defaultValue="caissier">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
      </div>
      {err && <p className="text-sm text-destructive md:col-span-4">{err}</p>}
      <div className="md:col-span-4"><Button type="submit" disabled={pending}>{pending ? "Création..." : "Créer l'utilisateur"}</Button></div>
    </form>
  );
}

type U = { id: number; nom: string; email: string; role: string; actif: number; permissions: string[] };

export function UserRow({ user }: { user: U }) {
  const [edit, setEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [pending, start] = useTransition();

  if (!edit) {
    return (
      <TR>
        <TD className="font-medium">{user.nom}</TD>
        <TD className="text-muted-foreground">{user.email}</TD>
        <TD><Badge variant="outline" className="capitalize">{user.role}</Badge></TD>
        <TD>{user.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="destructive">Désactivé</Badge>}</TD>
        <TD className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setShowReset(true)}><Key className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" disabled={pending}
            onClick={() => { if (confirm("Supprimer cet utilisateur ?")) start(() => deleteUtilisateur(user.id).catch((e) => alert(e.message))); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          {showReset && <ResetPasswordDialog email={user.email} onClose={() => setShowReset(false)} />}
        </TD>
      </TR>
    );
  }

  return (
    <TR>
      <TD colSpan={5}>
        <form
          className="space-y-3 py-2"
          action={(fd) => start(async () => { await updateUtilisateur(user.id, fd); setEdit(false); })}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Nom</Label><Input name="nom" defaultValue={user.nom} required /></div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select name="role" defaultValue={user.role}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="actif" defaultChecked={user.actif === 1} /> Compte actif
              </label>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Permissions</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOUTES_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="permissions" value={p} defaultChecked={user.permissions.includes(p)} />
                  {LABELS_PERMISSIONS[p]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending}
              onClick={() => { if (confirm("Réinitialiser les permissions selon le rôle par défaut ?")) start(() => resetPermissionsRole(user.id).then(() => setEdit(false))); }}>
              <RotateCcw className="h-4 w-4" /> Réinit. selon rôle
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEdit(false)}><X className="h-4 w-4" /> Annuler</Button>
            <Button type="submit" variant="success" disabled={pending}><Save className="h-4 w-4" /> Enregistrer</Button>
          </div>
        </form>
      </TD>
    </TR>
  );
}

function ResetPasswordDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold mb-3">Nouveau mot de passe</h3>
        <p className="text-sm text-muted-foreground mb-3">{email}</p>
        <form action={(fd) => start(async () => {
          try {
            await resetPassword(email, String(fd.get("password")));
            alert("Mot de passe modifié");
            onClose();
          } catch (e: any) { setErr(e?.message ?? "Erreur"); }
        })}>
          <Input name="password" type="password" placeholder="Nouveau mot de passe" required minLength={8} />
          {err && <p className="text-sm text-destructive mt-2">{err}</p>}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={pending}>Modifier</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
