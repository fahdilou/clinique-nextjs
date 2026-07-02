import { KpiSkeleton, Skeleton, TableSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div><Skeleton className="h-9 w-72" /><Skeleton className="h-5 w-40 mt-2" /></div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <TableSkeleton rows={8} cols={2} />
      <TableSkeleton rows={4} cols={3} />
    </div>
  );
}
