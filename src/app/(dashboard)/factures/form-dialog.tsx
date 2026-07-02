"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { createFacture } from "@/lib/actions/factures";
import { toISODate } from "@/lib/utils";

type A = { id: number; nom: string };

export function FactureFormDialog({ assurances }: { assurances: A[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle facture</Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Nouvelle facture</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form
              className="space-y-3"
              action={(fd) =>
                start(async () => {
                  try { await createFacture(fd); setOpen(false); }
                  catch (e: any) { setErr(e?.message ?? "Erreur"); }
                })
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date facture</Label>
                  <Input name="date_facture" type="date" required defaultValue={toISODate(new Date())} />
                </div>
                <div className="space-y-1.5">
                  <Label>N° facture</Label>
                  <Input name="num_facture" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assurance</Label>
                <Select name="assurance_id">
                  <option value="">— Aucune —</option>
                  {assurances.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Montant total</Label><Input name="montant_total" type="number" step="1" min="0" required /></div>
                <div className="space-y-1.5"><Label>Part assureur</Label><Input name="part_assureur" type="number" step="1" min="0" defaultValue={0} /></div>
                <div className="space-y-1.5"><Label>Part assuré</Label><Input name="part_assure" type="number" step="1" min="0" defaultValue={0} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select name="statut_part_assureur" defaultValue="En attente">
                    <option>En attente</option><option>Payée</option><option>Partiellement payée</option>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Date dépôt</Label><Input name="date_depot" type="date" /></div>
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
