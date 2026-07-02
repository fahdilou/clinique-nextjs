"use client";
import { ImportDialog } from "@/components/import-dialog";
import { importProduits } from "@/lib/actions/stock";

export function ImportProduitsButton() {
  return (
    <ImportDialog
      title="Importer des produits"
      example="P-A001;Paracétamol 500mg;500;boîte;100;10"
      columns={[
        { key: "code_article", label: "Code", required: true },
        { key: "designation", label: "Désignation", required: true },
        { key: "prix_unitaire", label: "Prix unitaire" },
        { key: "unite", label: "Unité" },
        { key: "stock_initial", label: "Stock initial" },
        { key: "seuil_alerte", label: "Seuil alerte" },
      ]}
      onImport={importProduits}
    />
  );
}
