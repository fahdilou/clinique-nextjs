"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Plus, X, Info } from "lucide-react";
import { createFacture } from "@/lib/actions/factures";
import { toISODate, formatMoney } from "@/lib/utils";

type A = { id: number; nom: string };

export function FactureFormDialog({ assurances }: { assurances: A[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // État réactif du formulaire
  const [montantTotal, setMontantTotal] = useState<number>(0);
  const [assuranceId, setAssuranceId] = useState<string>("");
  const [partAssure, setPartAssure] = useState<number>(0);

  const aAssurance = assuranceId !== "";
  const partAssureur = useMemo(() => {
    if (!aAssurance) return 0;
    return Math.max(0, montantTotal - partAssure);
  }, [montantTotal, partAssure, aAssurance]);

  // Reset des champs quand on ferme
  const handleClose = () => {
    setOpen(false);
    setMontantTotal(0);
    setAssuranceId("");
    setPartAssure(0);
    setErr(null);
  };

  // Validation côté client
  const invalidPartAssure = aAssurance && partAssure > montantTotal;

  const handleMontantTotalChange = (v: number) => {
    setMontantTotal(v);
    // Si sans assurance, part_assure = montant total automatiquement
    if (!aAssurance) setPartAssure(v);
    // Si part_assure devient > montant total, on l'ajuste
    else if (partAssure > v) setPartAssure(v);
  };

  const handleAssuranceChange = (v: string) => {
    setAssuranceId(v);
    if (v === "") {
      // Sans assurance : part_assure = tout
      setPartAssure(montantTotal);
    } else {
      // Avec assurance : on reset à 0 pour saisir le ticket modérateur
      setPartAssure(0);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle facture</Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Nouvelle facture</h2>
              <button onClick={handleClose}><X className="h-5 w-5" /></button>
            </div>
            <form
              className="space-y-3"
              action={(fd) => {
                if (invalidPartAssure) { setErr("La part patient ne peut pas dépasser le montant total."); return; }
                // Injecter les valeurs calculées
                fd.set("part_assure", String(partAssure));
                fd.set("part_assureur", String(partAssureur));
                start(async () => {
                  try { await createFacture(fd); handleClose(); }
                  catch (e: any) { setErr(e?.message ?? "Erreur"); }
                });
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date facture *</Label>
                  <Input name="date_facture" type="date" required defaultValue={toISODate(new Date())} />
                </div>
                <div className="space-y-1.5">
                  <Label>N° facture *</Label>
                  <Input name="num_facture" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Assurance</Label>
                <Select name="assurance_id" value={assuranceId} onChange={(e) => handleAssuranceChange(e.target.value)}>
                  <option value="">— Aucune assurance (paiement cash) —</option>
                  {assurances.filter((a) => a.nom !== "SANS ASSURANCE").map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Montant total *</Label>
                <Input
                  name="montant_total"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={montantTotal || ""}
                  onChange={(e) => handleMontantTotalChange(Number(e.target.value))}
                />
              </div>

              {!aAssurance ? (
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3 flex gap-2 text-sm">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Paiement direct patient</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      Le patient paie <strong>{formatMoney(montantTotal)}</strong> à la caisse.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-md bg-muted/50 p-3">
                  <div className="space-y-1.5">
                    <Label>Ticket modérateur (part patient à la caisse)</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max={montantTotal}
                      value={partAssure || ""}
                      onChange={(e) => setPartAssure(Number(e.target.value))}
                      placeholder="0 si totalement pris en charge"
                    />
                  </div>
                  <div className="flex justify-between text-sm items-center pt-2 border-t">
                    <span className="text-muted-foreground">Part assureur (calculée automatiquement)</span>
                    <span className="font-semibold text-warning">{formatMoney(partAssureur)}</span>
                  </div>
                  {invalidPartAssure && (
                    <p className="text-xs text-destructive">⚠️ La part patient dépasse le montant total.</p>
                  )}
                </div>
              )}

              {aAssurance && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Statut assurance</Label>
                    <Select name="statut_part_assureur" defaultValue="En attente">
                      <option>En attente</option><option>Soldé</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date dépôt (optionnel)</Label>
                    <Input name="date_depot" type="date" />
                  </div>
                </div>
              )}

              {err && <p className="text-sm text-destructive">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
                <Button type="submit" disabled={pending || invalidPartAssure || montantTotal <= 0}>
                  {pending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
