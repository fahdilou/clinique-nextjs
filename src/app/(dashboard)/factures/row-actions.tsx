"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { deleteFacture, updateFacturePayment, updateFacture, resetPaiementBanque } from "@/lib/actions/factures";
import { Trash2, Wallet, Pencil, X, Save, Undo2, Info } from "lucide-react";
import { toISODate, formatMoney } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

type F = {
  id: number; num_facture: string; date_facture: string; montant_total: number;
  assurance_id: number | null; part_assureur: number; part_assureur_payee: number;
  part_assure: number; statut_part_assureur: string; date_depot: string | null;
  motif_ecart_assurance?: string | null;
};

const MOTIFS_ECART = [
  "", "Ticket Modérateur / Franchise", "Acte non couvert",
  "Paiement partiel", "Refus partiel", "Autre",
];

export function FactureRowActions({
  facture, assurances,
}: {
  facture: F;
  assurances: { id: number; nom: string }[];
}) {
  const [editing, setEditing] = useState<"encaisse" | "full" | null>(null);
  const [amount, setAmount] = useState(facture.part_assureur_payee);
  const [dateEnc, setDateEnc] = useState(toISODate(new Date()));
  const [pending, start] = useTransition();

  // État form édition full
  const [montantTotal, setMontantTotal] = useState(facture.montant_total);
  const [assuranceId, setAssuranceId] = useState<string>(facture.assurance_id ? String(facture.assurance_id) : "");
  const [partAssure, setPartAssure] = useState(facture.part_assure);

  const aAssurance = assuranceId !== "";
  const partAssureur = useMemo(() => {
    if (!aAssurance) return 0;
    return Math.max(0, montantTotal - partAssure);
  }, [montantTotal, partAssure, aAssurance]);
  const invalidPart = aAssurance && partAssure > montantTotal;

  const openFullEdit = () => {
    // Réinitialiser depuis les valeurs actuelles
    setMontantTotal(facture.montant_total);
    setAssuranceId(facture.assurance_id ? String(facture.assurance_id) : "");
    setPartAssure(facture.part_assure);
    setEditing("full");
  };

  const handleMontantChange = (v: number) => {
    setMontantTotal(v);
    if (!aAssurance) setPartAssure(v);
    else if (partAssure > v) setPartAssure(v);
  };

  const handleAssuranceChange = (v: string) => {
    setAssuranceId(v);
    if (v === "") setPartAssure(montantTotal);
    else setPartAssure(facture.part_assure); // garde la saisie originale
  };


  return (
    <div className="flex items-center gap-1 justify-end">
      {editing === "encaisse" ? (
        <div className="flex items-center gap-1">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-8 w-24" placeholder="Montant" />
          <Input type="date" value={dateEnc} onChange={(e) => setDateEnc(e.target.value)} className="h-8 w-36" title="Date encaissement" />
          <Button size="sm" variant="success" disabled={pending || !dateEnc}
            onClick={() => start(async () => {
              try { await updateFacturePayment(facture.id, amount, dateEnc); setEditing(null); }
              catch (e: any) { alert(e.message); }
            })}>OK</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>×</Button>
        </div>
      ) : (
        <>
          <Button size="icon" variant="ghost" title="Encaisser" onClick={() => setEditing("encaisse")}><Wallet className="h-4 w-4" /></Button>
          {facture.part_assureur_payee > 0 && (
            <Button size="icon" variant="ghost" title="Annuler l'encaissement" disabled={pending}
              onClick={() => { if (confirm("Remettre cette facture 'En attente' et effacer le paiement ?")) start(() => resetPaiementBanque(facture.id).catch((e) => alert(e.message))); }}>
              <Undo2 className="h-4 w-4 text-warning" />
            </Button>
          )}
          <Button size="icon" variant="ghost" title="Modifier" onClick={openFullEdit}><Pencil className="h-4 w-4" /></Button>
          <DeleteConfirmDialog
            trigger={
              <Button size="icon" variant="ghost" title="Supprimer" asChild>
                <span><Trash2 className="h-4 w-4 text-destructive" /></span>
              </Button>
            }
            title="Supprimer cette facture"
            description={
              <p>
                Cette facture va être <strong>définitivement supprimée</strong> de la base.
                Elle ne pourra pas être récupérée.
              </p>
            }
            itemLabel={`N° ${facture.num_facture} — ${formatMoney(facture.montant_total)}`}
            onDelete={async () => { await deleteFacture(facture.id); }}
          />
        </>
      )}

      {editing === "full" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Modifier facture</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <form className="space-y-3"
              action={(fd) => {
                if (invalidPart) return;
                fd.set("part_assure", String(partAssure));
                fd.set("part_assureur", String(partAssureur));
                start(async () => { try { await updateFacture(facture.id, fd); setEditing(null); } catch (e: any) { alert(e.message); } });
              }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input name="date_facture" type="date" defaultValue={toISODate(facture.date_facture)} required /></div>
                <div className="space-y-1.5"><Label>N° facture</Label><Input name="num_facture" defaultValue={facture.num_facture} required /></div>
              </div>

              <div className="space-y-1.5">
                <Label>Assurance</Label>
                <Select name="assurance_id" value={assuranceId} onChange={(e) => handleAssuranceChange(e.target.value)}>
                  <option value="">— Aucune assurance —</option>
                  {assurances.filter((a) => a.nom !== "SANS ASSURANCE").map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Montant total</Label>
                <Input name="montant_total" type="number" step="1" min="0" required
                  value={montantTotal || ""} onChange={(e) => handleMontantChange(Number(e.target.value))} />
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
                    <Label>Ticket modérateur (part patient)</Label>
                    <Input type="number" step="1" min="0" max={montantTotal}
                      value={partAssure || ""} onChange={(e) => setPartAssure(Number(e.target.value))}
                      placeholder="0 si totalement pris en charge" />
                  </div>
                  <div className="flex justify-between text-sm items-center pt-2 border-t">
                    <span className="text-muted-foreground">Part assureur (calculée)</span>
                    <span className="font-semibold text-warning">{formatMoney(partAssureur)}</span>
                  </div>
                  {invalidPart && <p className="text-xs text-destructive">⚠️ La part patient dépasse le montant total.</p>}
                </div>
              )}

              {aAssurance && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Statut</Label>
                      <Select name="statut_part_assureur" defaultValue={facture.statut_part_assureur}>
                        <option>N/A</option><option>En attente</option><option>Soldé</option>
                        <option>Payé Partiel</option><option>Rejeté</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Date dépôt</Label><Input name="date_depot" type="date" defaultValue={facture.date_depot ? toISODate(facture.date_depot) : ""} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Motif d'écart (si Payé Partiel / Rejeté)</Label>
                    <Select name="motif_ecart_assurance" defaultValue={facture.motif_ecart_assurance ?? ""}>
                      {MOTIFS_ECART.map((m) => <option key={m} value={m}>{m || "— Aucun —"}</option>)}
                    </Select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                <Button type="submit" variant="success" disabled={pending || invalidPart}><Save className="h-4 w-4" /> Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
