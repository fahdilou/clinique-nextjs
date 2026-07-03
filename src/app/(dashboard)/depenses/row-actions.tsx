"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateDepense, deleteDepense } from "@/lib/actions/depenses";
import { CATEGORIES_DEPENSES, MODES_PAIEMENT } from "@/lib/constants";
import { toISODate, formatMoney } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Pencil, Trash2, X, Save } from "lucide-react";

export type DepenseRow = {
  id: number;
  date_depense: string;
  categorie: string;
  description: string | null;
  montant: number;
  num_facture: string | null;
  mode_paiement: string | null;
  beneficiaire: string | null;
};

export function DepenseRowActions({ depense }: { depense: DepenseRow }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-1 justify-end">
      <Button size="icon" variant="ghost" title="Modifier" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>

      <DeleteConfirmDialog
        trigger={
          <Button size="icon" variant="ghost" title="Supprimer" asChild>
            <span><Trash2 className="h-4 w-4 text-destructive" /></span>
          </Button>
        }
        title="Supprimer cette dépense"
        description={
          <p>
            Cette dépense va être <strong>définitivement supprimée</strong> de la base.
            Elle ne pourra pas être récupérée.
          </p>
        }
        itemLabel={`${depense.categorie} — ${formatMoney(depense.montant)} — ${depense.description ?? "(sans description)"}`}
        onDelete={async () => { await deleteDepense(depense.id); }}
      />

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Modifier la dépense</h3>
              <button onClick={() => setEditing(false)}><X className="h-5 w-5" /></button>
            </div>
            <form
              className="grid grid-cols-2 gap-3"
              action={(fd) => start(async () => {
                try { await updateDepense(depense.id, fd); setEditing(false); }
                catch (e: any) { alert(e.message); }
              })}
            >
              <div className="space-y-1.5"><Label>Date</Label><Input name="date_depense" type="date" required defaultValue={toISODate(depense.date_depense)} /></div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select name="categorie" defaultValue={depense.categorie} required>
                  {CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Montant</Label><Input name="montant" type="number" step="1" min="0" required defaultValue={depense.montant} /></div>
              <div className="space-y-1.5">
                <Label>Mode paiement</Label>
                <Select name="mode_paiement" defaultValue={depense.mode_paiement ?? "Espèces"}>
                  {MODES_PAIEMENT.map((m) => <option key={m}>{m}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label>Description</Label><Input name="description" defaultValue={depense.description ?? ""} /></div>
              <div className="space-y-1.5"><Label>Bénéficiaire</Label><Input name="beneficiaire" defaultValue={depense.beneficiaire ?? ""} /></div>
              <div className="space-y-1.5"><Label>N° facture</Label><Input name="num_facture" defaultValue={depense.num_facture ?? ""} /></div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
                <Button type="submit" variant="success" disabled={pending}><Save className="h-4 w-4" /> Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
