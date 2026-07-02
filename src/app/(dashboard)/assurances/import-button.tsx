"use client";
import { ImportDialog } from "@/components/import-dialog";
import { importAssurances } from "@/lib/actions/assurances";

export function ImportAssurancesButton() {
  return (
    <ImportDialog
      title="Importer des assurances"
      example="CNSS;contact@cnss.bj"
      columns={[
        { key: "nom", label: "Nom compagnie", required: true },
        { key: "email", label: "Email" },
      ]}
      onImport={importAssurances}
    />
  );
}
