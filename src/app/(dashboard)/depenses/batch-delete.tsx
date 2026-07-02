"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { batchDeleteDepenses, previewBatchDelete, type BatchDeleteMode } from "@/lib/actions/depenses";
import { CATEGORIES_DEPENSES } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { Trash2, X, AlertTriangle } from "lucide-react";

const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function BatchDeleteButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<BatchDeleteMode["type"]>("annee");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [mois, setMois] = useState(1);
  const [categorie, setCategorie] = useState<string>(CATEGORIES_DEPENSES[0]);
  const [confirmToken, setConfirmToken] = useState("");
  const [preview, setPreview] = useState<{ count: number; total: number } | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const buildMode = (): BatchDeleteMode => {
    if (type === "annee") return { type, annee };
    if (type === "mois") return { type, annee, mois };
    if (type === "categorie") return { type, categorie };
    return { type: "tout" };
  };

  const doPreview = () => start(async () => {
    try { setPreview(await previewBatchDelete(buildMode())); setErr(null); }
    catch (e: any) { setErr(e?.message); }
  });

  const doDelete = () => {
    if (!preview || preview.count === 0) return;
    if (type === "tout" && confirmToken !== "CONFIRMER") { setErr("Tapez CONFIRMER pour valider"); return; }
    if (!confirm(`Supprimer définitivement ${preview.count} dépense(s) pour un total de ${formatMoney(preview.total)} ?`)) return;
    start(async () => {
      try {
        const r = await batchDeleteDepenses(buildMode(), confirmToken);
        alert(`${r.deleted} dépense(s) supprimée(s).`);
        setOpen(false); setPreview(null); setConfirmToken("");
      } catch (e: any) { setErr(e?.message); }
    });
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /> Supprimer en masse</Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Zone dangereuse
              </h3>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Mode de suppression</Label>
                <Select value={type} onChange={(e) => { setType(e.target.value as any); setPreview(null); }}>
                  <option value="annee">Toute une année</option>
                  <option value="mois">Un mois précis</option>
                  <option value="categorie">Une catégorie entière</option>
                  <option value="tout">⚠️ Toutes les dépenses</option>
                </Select>
              </div>

              {(type === "annee" || type === "mois") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Année</Label>
                    <Input type="number" value={annee} onChange={(e) => { setAnnee(Number(e.target.value)); setPreview(null); }} />
                  </div>
                  {type === "mois" && (
                    <div className="space-y-1.5"><Label>Mois</Label>
                      <Select value={mois} onChange={(e) => { setMois(Number(e.target.value)); setPreview(null); }}>
                        {MOIS_FR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {type === "categorie" && (
                <div className="space-y-1.5"><Label>Catégorie</Label>
                  <Select value={categorie} onChange={(e) => { setCategorie(e.target.value); setPreview(null); }}>
                    {CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </div>
              )}

              {type === "tout" && (
                <div className="space-y-1.5">
                  <Label>Confirmez en tapant <code>CONFIRMER</code></Label>
                  <Input value={confirmToken} onChange={(e) => setConfirmToken(e.target.value)} placeholder="CONFIRMER" />
                </div>
              )}

              <Button variant="outline" onClick={doPreview} disabled={pending}>Aperçu</Button>

              {preview && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <strong>{preview.count}</strong> dépense(s) — Total : <strong>{formatMoney(preview.total)}</strong>
                </div>
              )}

              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={doDelete} disabled={pending || !preview || preview.count === 0}>
                {pending ? "Suppression..." : `Supprimer ${preview?.count ?? 0}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
