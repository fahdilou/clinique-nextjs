import { KpiSkeleton, Skeleton, TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-9 w-64" /><Skeleton className="h-5 w-96 mt-2" /></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TableSkeleton rows={6} cols={2} />
        <TableSkeleton rows={6} cols={2} />
      </div>
    </div>
  );
}
