import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return <div role="status" aria-label="Loading your entries" className="space-y-6">
    <span className="sr-only">Loading your entries</span>
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-10 w-60 max-w-full" />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-72" /><Skeleton className="h-72 lg:col-span-2" />
    </div>
  </div>;
}