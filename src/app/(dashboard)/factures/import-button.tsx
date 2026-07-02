"use client";
import { ImportDialog } from "@/components/import-dialog";
import { importFactures } from "@/lib/actions/factures";

export function ImportFacturesButton() {
  return (
    <ImportDialog
      title="Importer des factures"
      example="2026-01-15;F-2026-001;150000;CNSS;100000;50000"
      columns={[
        { key: "date_facture", label: "Date", required: true },
        { key: "num_facture", label: "N° facture", required: true },
        { key: "montant_total", label: "Montant total", required: true },
        { key: "assurance", label: "Assurance (nom)" },
        { key: "part_assureur", label: "Part assureur" },
        { key: "part_assure", label: "Part assuré" },
        { key: "statut", label: "Statut" },
        { key: "date_depot", label: "Date dépôt" },
      ]}
      onImport={importFactures}
    />
  );
}
