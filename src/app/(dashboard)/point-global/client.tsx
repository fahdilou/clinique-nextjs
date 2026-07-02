"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { batchUpdateDepot } from "@/lib/actions/factures";
import { formatMoney, formatDate, toISODate } from "@/lib/utils";
import { TR, TD } from "@/components/ui/table";
import { Check, Square } from "lucide-react";

type Fact = {
  id: number;
  num_facture: string;
  date_facture: string;
  montant_total: number;
  part_assureur: number;
  statut_part_assureur: string | null;
};

export function BatchDepotSection({ nom, factures }: { nom: string; factures: Fact[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(factures.map((f) => f.id)));
  const [date, setDate] = useState(toISODate(new Date()));
  const [pending, start] = useTransition();

  const toggle = (id: number) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const allChecked = selected.size === factures.length;
  const totalSelected = factures.filter((f) => selected.has(f.id)).reduce((s, f) => s + f.montant_total, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b">
        <Button size="sm" variant="outline"
          onClick={() => setSelected(allChecked ? new Set() : new Set(factures.map((f) => f.id)))}>
          {allChecked ? "Tout décocher" : "Tout cocher"}
        </Button>
        <span className="text-sm text-muted-foreground">
          <strong className="text-foreground">{selected.size}</strong> / {factures.length} sélectionnée(s) — Total : <strong className="text-foreground">{formatMoney(totalSelected)}</strong>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
          <Button size="sm" disabled={pending || selected.size === 0 || !date}
            onClick={() => {
              const ids = [...selected];
              if (confirm(`Appliquer la date de dépôt à ${ids.length} facture(s) de ${nom} ?`))
                start(() => batchUpdateDepot(ids, date));
            }}>
            Appliquer aux {selected.size}
          </Button>
        </div>
      </div>

      <div className="max-h-80 overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-1.5 w-10"></th>
              <th className="text-left px-2 py-1.5">Date</th>
              <th className="text-left px-2 py-1.5">N°</th>
              <th className="text-right px-2 py-1.5">Total</th>
              <th className="text-right px-2 py-1.5">Assureur</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => toggle(f.id)}>
                <td className="px-2 py-1.5">
                  {selected.has(f.id) ? <Check className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                </td>
                <td className="px-2 py-1.5">{formatDate(f.date_facture)}</td>
                <td className="px-2 py-1.5 font-medium">{f.num_facture}</td>
                <td className="px-2 py-1.5 text-right">{formatMoney(f.montant_total)}</td>
                <td className="px-2 py-1.5 text-right">{formatMoney(f.part_assureur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
