"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createDepense } from "@/lib/actions/depenses";
import { CATEGORIES_DEPENSES, MODES_PAIEMENT } from "@/lib/constants";
import { toISODate } from "@/lib/utils";

export function DepenseForm() {
  const [pending, start] = useTransition();
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-3 gap-3"
      id="dep-form"
      action={(fd) => start(async () => {
        await createDepense(fd);
        (document.getElementById("dep-form") as HTMLFormElement)?.reset();
      })}
    >
      <div className="space-y-1.5"><Label>Date</Label><Input name="date_depense" type="date" required defaultValue={toISODate(new Date())} /></div>
      <div className="space-y-1.5">
        <Label>Catégorie</Label>
        <Select name="categorie" required defaultValue="">
          <option value="" disabled>— Choisir —</option>
          {CATEGORIES_DEPENSES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Montant</Label><Input name="montant" type="number" step="1" min="0" required /></div>
      <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Input name="description" /></div>
      <div className="space-y-1.5"><Label>N° facture / bon</Label><Input name="num_facture" /></div>
      <div className="space-y-1.5"><Label>Bénéficiaire</Label><Input name="beneficiaire" /></div>
      <div className="space-y-1.5">
        <Label>Mode paiement</Label>
        <Select name="mode_paiement" defaultValue="Espèces">
          {MODES_PAIEMENT.map((m) => <option key={m}>{m}</option>)}
        </Select>
      </div>
      <div className="flex items-end"><Button type="submit" disabled={pending} className="w-full">{pending ? "..." : "Enregistrer"}</Button></div>
    </form>
  );
}

