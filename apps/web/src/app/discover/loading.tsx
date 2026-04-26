import { CardSkeletonGrid, Skeleton } from '@melodix/ui';

export default function Loading() {
  return (
    <div>
      <header className="relative mt-2 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:px-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </header>
      <div className="mt-10">
        <Skeleton className="mb-4 h-5 w-44" />
        <CardSkeletonGrid count={10} />
      </div>
    </div>
  );
}
