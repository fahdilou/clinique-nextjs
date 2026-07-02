import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-2 pt-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
