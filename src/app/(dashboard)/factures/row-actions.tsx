"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { deleteFacture, updateFacturePayment, updateFacture, resetPaiementBanque } from "@/lib/actions/factures";
import { Trash2, Wallet, Pencil, X, Save, Undo2 } from "lucide-react";
import { toISODate } from "@/lib/utils";

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
  const [pending, start] = useTransition();

  const handleDelete = () => {
    if (!confirm("Supprimer cette facture ?")) return;
    start(() => deleteFacture(facture.id).catch((e) => alert(e.message)));
  };

  return (
    <div className="flex items-center gap-1 justify-end">
      {editing === "encaisse" ? (
        <div className="flex items-center gap-1">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-8 w-24" />
          <Button size="sm" variant="success" disabled={pending}
            onClick={() => start(async () => { await updateFacturePayment(facture.id, amount); setEditing(null); })}>OK</Button>
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
          <Button size="icon" variant="ghost" title="Modifier" onClick={() => setEditing("full")}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Supprimer" onClick={handleDelete} disabled={pending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </>
      )}

      {editing === "full" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Modifier facture</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <form className="space-y-3"
              action={(fd) => start(async () => { try { await updateFacture(facture.id, fd); setEditing(null); } catch (e: any) { alert(e.message); } })}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input name="date_facture" type="date" defaultValue={toISODate(facture.date_facture)} required /></div>
                <div className="space-y-1.5"><Label>N° facture</Label><Input name="num_facture" defaultValue={facture.num_facture} required /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Assurance</Label>
                <Select name="assurance_id" defaultValue={facture.assurance_id ?? ""}>
                  <option value="">— Aucune —</option>
                  {assurances.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Montant total</Label><Input name="montant_total" type="number" step="1" min="0" defaultValue={facture.montant_total} required /></div>
                <div className="space-y-1.5"><Label>Part assureur</Label><Input name="part_assureur" type="number" step="1" min="0" defaultValue={facture.part_assureur} /></div>
                <div className="space-y-1.5"><Label>Part assuré</Label><Input name="part_assure" type="number" step="1" min="0" defaultValue={facture.part_assure} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select name="statut_part_assureur" defaultValue={facture.statut_part_assureur}>
                    <option>N/A</option>
                    <option>En attente</option>
                    <option>Soldé</option>
                    <option>Payé Partiel</option>
                    <option>Rejeté</option>
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
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                <Button type="submit" variant="success" disabled={pending}><Save className="h-4 w-4" /> Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
