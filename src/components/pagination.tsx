import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  basePath, currentParams, page, pageSize, total,
}: {
  basePath: string;
  currentParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(currentParams).forEach(([k, v]) => { if (v && k !== "page") params.set(k, v); });
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <div className="text-sm text-muted-foreground">
        {from}–{to} sur {total}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link href={buildHref(Math.max(1, page - 1))}><ChevronLeft className="h-4 w-4" /> Précédent</Link>
        </Button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
          <Link href={buildHref(Math.min(totalPages, page + 1))}>Suivant <ChevronRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
