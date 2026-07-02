import { KpiSkeleton, Skeleton, TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
