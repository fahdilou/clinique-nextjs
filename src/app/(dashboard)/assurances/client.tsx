"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TR, TD } from "@/components/ui/table";
import { createAssurance, updateAssurance, deleteAssurance } from "@/lib/actions/assurances";
import { Pencil, Trash2, Save, X } from "lucide-react";

export function AssuranceForm() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap gap-2"
      action={(fd) => start(async () => {
        try { await createAssurance(fd); (document.getElementById("ass-form") as HTMLFormElement)?.reset(); }
        catch (e: any) { setErr(e?.message ?? "Erreur"); }
      })}
      id="ass-form"
    >
      <Input name="nom" placeholder="Nom de la compagnie" required className="max-w-xs" />
      <Input name="email" type="email" placeholder="contact@..." className="max-w-xs" />
      <Button type="submit" disabled={pending}>Ajouter</Button>
      {err && <span className="text-sm text-destructive self-center">{err}</span>}
    </form>
  );
}

type A = { id: number; nom: string; email: string | null; nbFactures: number };

export function AssuranceRow({ assurance, canManage }: { assurance: A; canManage: boolean }) {
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();

  if (!edit) {
    return (
      <TR>
        <TD className="font-medium">{assurance.nom}</TD>
        <TD>{assurance.email ?? "-"}</TD>
        <TD className="text-right">{assurance.nbFactures}</TD>
        {canManage && (
          <TD className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" disabled={pending}
              onClick={() => { if (confirm("Supprimer ?")) start(() => deleteAssurance(assurance.id).catch((e) => alert(e.message))); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </TD>
        )}
      </TR>
    );
  }
  return (
    <TR>
      <TD colSpan={canManage ? 4 : 3}>
        <form
          className="flex flex-wrap gap-2 items-center"
          action={(fd) => start(async () => { await updateAssurance(assurance.id, fd); setEdit(false); })}
        >
          <Input name="nom" defaultValue={assurance.nom} required className="max-w-xs" />
          <Input name="email" type="email" defaultValue={assurance.email ?? ""} className="max-w-xs" />
          <Button size="icon" type="submit" variant="success" disabled={pending}><Save className="h-4 w-4" /></Button>
          <Button size="icon" type="button" variant="ghost" onClick={() => setEdit(false)}><X className="h-4 w-4" /></Button>
        </form>
      </TD>
    </TR>
  );
}
