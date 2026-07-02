"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton({ endpoint, filename }: { endpoint: string; filename: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={endpoint} download={filename}><Download className="h-4 w-4" /> Exporter</a>
    </Button>
  );
}
