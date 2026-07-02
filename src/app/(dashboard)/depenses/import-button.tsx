"use client";
import { ImportDialog } from "@/components/import-dialog";
import { importDepenses } from "@/lib/actions/depenses";

export function ImportDepensesButton() {
  return (
    <ImportDialog
      title="Importer des dépenses"
      example="2026-01-15;Carburant;25000;Plein Toyota;Banque;Station Total"
      columns={[
        { key: "date_depense", label: "Date", required: true },
        { key: "categorie", label: "Catégorie", required: true },
        { key: "montant", label: "Montant", required: true },
        { key: "description", label: "Description" },
        { key: "mode_paiement", label: "Mode paiement" },
        { key: "beneficiaire", label: "Bénéficiaire" },
        { key: "num_facture", label: "N° facture" },
      ]}
      onImport={importDepenses}
    />
  );
}
