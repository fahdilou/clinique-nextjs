"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { parseSpreadsheet } from "@/lib/csv";

type Props = {
  title: string;
  columns: { key: string; label: string; required?: boolean }[];
  example?: string;
  onImport: (rows: Record<string, string>[]) => Promise<{ inserted: number; errors: string[] }>;
};

export function ImportDialog({ title, columns, example, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      const parsed = await parseSpreadsheet(f);
      setRows(parsed);
      setResult(null);
    } catch (err: any) { alert(err?.message ?? "Erreur de lecture"); }
  };

  const close = () => { setOpen(false); setRows([]); setFileName(""); setResult(null); };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Upload className="h-4 w-4" /> Importer</Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-card rounded-xl shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={close}><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3 mb-4 text-sm">
              <div>
                <p className="font-medium mb-1">Colonnes attendues (CSV/Excel — 1ère ligne = en-têtes) :</p>
                <div className="flex flex-wrap gap-1">
                  {columns.map((c) => (
                    <code key={c.key} className={`px-2 py-0.5 rounded text-xs ${c.required ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                      {c.key}{c.required && " *"}
                    </code>
                  ))}
                </div>
                {example && <p className="text-xs text-muted-foreground mt-2">Exemple : {example}</p>}
              </div>

              <div>
                <Label>Fichier (.csv, .xlsx)</Label>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile}
                  className="mt-1 block w-full text-sm file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-primary-foreground" />
              </div>

              {rows.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2">
                    <strong>{rows.length}</strong> lignes détectées dans <em>{fileName}</em>
                  </p>
                  <div className="border rounded-md overflow-auto max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>{Object.keys(rows[0]).map((k) => <th key={k} className="text-left px-2 py-1.5">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t">{Object.values(r).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 5 && <p className="text-xs text-muted-foreground mt-1">... et {rows.length - 5} autres lignes</p>}
                </div>
              )}

              {result && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" /> <strong>{result.inserted}</strong> lignes importées
                  </div>
                  {result.errors.length > 0 && (
                    <div className="text-destructive">
                      <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4" /> {result.errors.length} erreurs :</div>
                      <ul className="text-xs list-disc pl-5 max-h-32 overflow-auto">
                        {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={close}>Fermer</Button>
              <Button disabled={rows.length === 0 || pending}
                onClick={() => start(async () => { const r = await onImport(rows); setResult(r); })}>
                {pending ? "Import..." : `Importer ${rows.length} lignes`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
