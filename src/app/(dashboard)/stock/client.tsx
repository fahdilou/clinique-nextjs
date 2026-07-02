"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createProduit, createMouvement, updateProduit, deleteProduit, toggleProduit } from "@/lib/actions/stock";
import { toISODate } from "@/lib/utils";
import { Pencil, Trash2, Save, X, Power } from "lucide-react";

export function ProduitForm() {
  const [pending, start] = useTransition();
  return (
    <form
      className="grid grid-cols-2 gap-3"
      id="prod-form"
      action={(fd) => start(async () => { await createProduit(fd); (document.getElementById("prod-form") as HTMLFormElement)?.reset(); })}
    >
      <div className="space-y-1.5"><Label>Code article</Label><Input name="code_article" required /></div>
      <div className="space-y-1.5"><Label>Unité</Label><Input name="unite" defaultValue="unité" /></div>
      <div className="space-y-1.5 col-span-2"><Label>Désignation</Label><Input name="designation" required /></div>
      <div className="space-y-1.5"><Label>Prix unitaire</Label><Input name="prix_unitaire" type="number" step="1" min="0" defaultValue={0} /></div>
      <div className="space-y-1.5"><Label>Stock initial</Label><Input name="stock_initial" type="number" step="1" min="0" defaultValue={0} /></div>
      <div className="space-y-1.5"><Label>Seuil alerte</Label><Input name="seuil_alerte" type="number" step="1" min="0" defaultValue={5} /></div>
      <div className="flex items-end"><Button type="submit" disabled={pending} className="w-full">Ajouter</Button></div>
    </form>
  );
}

type ProdEdit = { id: number; code_article: string; designation: string; prix_unitaire: number; unite: string; seuil_alerte: number };

export function ProduitRowActions({ produit }: { produit: ProdEdit }) {
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();

  if (!edit) {
    return (
      <div className="flex gap-1 justify-end">
        <Button size="icon" variant="ghost" title="Modifier" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" title="Désactiver" disabled={pending}
          onClick={() => start(() => toggleProduit(produit.id, false).catch((e) => alert(e.message)))}>
          <Power className="h-4 w-4 text-warning" />
        </Button>
        <Button size="icon" variant="ghost" title="Supprimer" disabled={pending}
          onClick={() => { if (confirm("Supprimer ce produit ?")) start(() => deleteProduit(produit.id).catch((e) => alert(e.message))); }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEdit(false)}>
      <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center"><h3 className="font-semibold">Modifier produit</h3><button onClick={() => setEdit(false)}><X className="h-5 w-5" /></button></div>
        <form className="grid grid-cols-2 gap-3"
          action={(fd) => start(async () => { await updateProduit(produit.id, fd); setEdit(false); })}>
          <div className="space-y-1.5"><Label>Code</Label><Input name="code_article" defaultValue={produit.code_article} required /></div>
          <div className="space-y-1.5"><Label>Unité</Label><Input name="unite" defaultValue={produit.unite} /></div>
          <div className="space-y-1.5 col-span-2"><Label>Désignation</Label><Input name="designation" defaultValue={produit.designation} required /></div>
          <div className="space-y-1.5"><Label>Prix unitaire</Label><Input name="prix_unitaire" type="number" step="1" min="0" defaultValue={produit.prix_unitaire} /></div>
          <div className="space-y-1.5"><Label>Seuil alerte</Label><Input name="seuil_alerte" type="number" step="1" min="0" defaultValue={produit.seuil_alerte} /></div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEdit(false)}>Annuler</Button>
            <Button type="submit" variant="success" disabled={pending}><Save className="h-4 w-4" /> Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MouvementForm({ produits }: { produits: { id: number; designation: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="grid grid-cols-2 gap-3"
      id="mvt-form"
      action={(fd) => start(async () => { await createMouvement(fd); (document.getElementById("mvt-form") as HTMLFormElement)?.reset(); })}
    >
      <div className="space-y-1.5"><Label>Date</Label><Input name="date_mouvement" type="date" required defaultValue={toISODate(new Date())} /></div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select name="type_mouvement" required defaultValue="entree">
          <option value="entree">Entrée</option>
          <option value="sortie">Sortie</option>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Produit</Label>
        <Select name="produit_id" required defaultValue="">
          <option value="" disabled>— Choisir —</option>
          {produits.map((p) => <option key={p.id} value={p.id}>{p.designation}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Quantité</Label><Input name="quantite" type="number" step="1" min="1" required /></div>
      <div className="space-y-1.5"><Label>Motif</Label><Input name="motif" /></div>
      <div className="col-span-2"><Button type="submit" disabled={pending} className="w-full">Enregistrer le mouvement</Button></div>
    </form>
  );
}
