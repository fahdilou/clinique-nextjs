"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { batchEncaissement, type EncaissementLine } from "@/lib/actions/factures";
import { formatMoney, formatDate, toISODate } from "@/lib/utils";
import { Check, Calendar } from "lucide-react";
import { Label } from "@/components/ui/label";

const MOTIFS_REJET = [
  "",
  "Dossier rejeté / non conforme",
  "Assuré non à jour",
  "Erreur de facturation",
  "Autre",
];

const MOTIFS_ECART = [
  "",
  "Application Ticket Modérateur / Franchise",
  "Acte non couvert",
  "Paiement partiel (Avance)",
  "Refus partiel",
  "Autre",
];

type F = {
  id: number;
  num_facture: string;
  date_facture: string;
  date_depot: string | null;
  part_assureur: number;
  part_assureur_payee: number;
  statut: string;
};

type LineState = { selected: boolean; montant: number; motif: string };

export function EncaissementCie({ factures }: { factures: F[] }) {
  const [lines, setLines] = useState<Record<number, LineState>>(() => {
    const init: Record<number, LineState> = {};
    factures.forEach((f) => {
      init[f.id] = { selected: false, montant: f.part_assureur, motif: "" };
    });
    return init;
  });
  const [dateEncaissement, setDateEncaissement] = useState(toISODate(new Date()));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const update = (id: number, patch: Partial<LineState>) => {
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const selectedFacts = factures.filter((f) => lines[f.id]?.selected);
  const totalSaisi = selectedFacts.reduce((s, f) => s + (lines[f.id]?.montant ?? 0), 0);

  const submit = () => {
    setErr(null);
    if (selectedFacts.length === 0) return;
    if (!dateEncaissement) { setErr("La date d'encaissement est obligatoire"); return; }
    const payload: EncaissementLine[] = selectedFacts.map((f) => ({
      id: f.id,
      montant_recu: lines[f.id].montant,
      motif: lines[f.id].motif || null,
    }));
    if (!confirm(`Valider l'encaissement de ${selectedFacts.length} facture(s) au ${new Date(dateEncaissement).toLocaleDateString("fr-FR")} — Total : ${formatMoney(totalSaisi)} ?`)) return;
    start(async () => {
      try { await batchEncaissement(payload, dateEncaissement); }
      catch (e: any) { setErr(e?.message ?? "Erreur"); }
    });
  };

  return (
    <div className="space-y-3">
      {/* Barre date d'encaissement */}
      <div className="flex flex-wrap items-end gap-3 pb-3 border-b bg-primary/5 -mx-6 -mt-6 px-6 pt-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date d'encaissement <span className="text-destructive">*</span>
          </Label>
          <Input type="date" value={dateEncaissement} required
            onChange={(e) => setDateEncaissement(e.target.value)}
            className="h-9 w-48" />
        </div>
        <p className="text-xs text-muted-foreground pb-2">
          Date à laquelle le virement bancaire a été reçu (obligatoire)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
        <Button size="sm" variant="outline"
          onClick={() => {
            const allSel = factures.every((f) => lines[f.id]?.selected);
            setLines((prev) => {
              const next = { ...prev };
              factures.forEach((f) => (next[f.id] = { ...next[f.id], selected: !allSel }));
              return next;
            });
          }}>
          {factures.every((f) => lines[f.id]?.selected) ? "Tout décocher" : "Tout cocher"}
        </Button>
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{selectedFacts.length}</strong> sélectionnée(s) — Total à encaisser : <strong className="text-foreground">{formatMoney(totalSaisi)}</strong>
        </span>
        <Button className="ml-auto" size="sm"
          disabled={pending || selectedFacts.length === 0 || !dateEncaissement}
          variant="success" onClick={submit}>
          {pending ? "Validation..." : `Valider ${selectedFacts.length} encaissement(s)`}
        </Button>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="overflow-auto rounded border max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-1.5 w-8"></th>
              <th className="text-left px-2 py-1.5">Date</th>
              <th className="text-left px-2 py-1.5">N°</th>
              <th className="text-left px-2 py-1.5">Dépôt</th>
              <th className="text-right px-2 py-1.5">Part assureur</th>
              <th className="text-right px-2 py-1.5 w-32">Montant reçu</th>
              <th className="text-left px-2 py-1.5 w-56">Motif d'écart</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => {
              const line = lines[f.id];
              const ecart = f.part_assureur - line.montant;
              const isRejet = line.montant === 0;
              const isSolde = line.montant >= f.part_assureur;
              const isPartiel = !isRejet && !isSolde;
              const motifs = isRejet ? MOTIFS_REJET : isPartiel ? MOTIFS_ECART : [""];
              const needMotif = line.selected && (isRejet || isPartiel);
              return (
                <tr key={f.id} className={`border-t ${line.selected ? "bg-primary/5" : ""}`}>
                  <td className="px-2 py-1.5">
                    <input type="checkbox" checked={line.selected}
                      onChange={(e) => update(f.id, { selected: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1.5">{formatDate(f.date_facture)}</td>
                  <td className="px-2 py-1.5 font-medium">{f.num_facture}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{formatDate(f.date_depot)}</td>
                  <td className="px-2 py-1.5 text-right">{formatMoney(f.part_assureur)}</td>
                  <td className="px-2 py-1.5">
                    <Input type="number" value={line.montant} disabled={!line.selected}
                      onChange={(e) => update(f.id, { montant: Number(e.target.value) })}
                      className="h-8 text-right" />
                  </td>
                  <td className="px-2 py-1.5">
                    {line.selected && isSolde ? (
                      <span className="text-xs text-success font-medium">✅ Soldé</span>
                    ) : (
                      <Select value={line.motif} disabled={!line.selected}
                        onChange={(e) => update(f.id, { motif: e.target.value })}
                        className={`h-8 text-xs ${needMotif && !line.motif ? "border-warning" : ""}`}>
                        {motifs.map((m) => <option key={m} value={m}>
                          {m || (isRejet ? "— Motif rejet —" : "— Motif écart —")}
                        </option>)}
                      </Select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
