"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X, Trash2 } from "lucide-react";

type Props = {
  trigger?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  itemLabel: string;
  requiredWord?: string;
  onDelete: () => Promise<void>;
};

export function DeleteConfirmDialog({
  trigger, title, description, itemLabel,
  requiredWord = "SUPPRIMER", onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const canDelete = confirmText === requiredWord;

  const handleDelete = () => {
    if (!canDelete) return;
    start(async () => {
      try {
        await onDelete();
        setOpen(false);
        setConfirmText("");
      } catch (e: any) {
        setErr(e?.message ?? "Erreur lors de la suppression");
      }
    });
  };

  const close = () => { setOpen(false); setConfirmText(""); setErr(null); };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={close}>
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {title}
              </h3>
              <button onClick={close}><X className="h-5 w-5" /></button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              {description}
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">Action irréversible</p>
                <p className="text-xs mt-1">Élément : <strong className="text-foreground">{itemLabel}</strong></p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Confirmez en tapant <code className="px-1.5 py-0.5 bg-muted rounded text-destructive font-mono">{requiredWord}</code>
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requiredWord}
                autoFocus
                autoComplete="off"
              />
            </div>

            {err && <p className="text-sm text-destructive">{err}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>Annuler</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={pending || !canDelete}>
                {pending ? "Suppression..." : <><Trash2 className="h-4 w-4" /> Supprimer définitivement</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
