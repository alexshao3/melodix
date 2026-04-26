import { CardSkeletonGrid, Skeleton } from '@melodix/ui';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-72 w-full rounded-3xl" />
      <div className="mt-10 space-y-12">
        <div>
          <Skeleton className="mb-4 h-5 w-44" />
          <CardSkeletonGrid count={10} />
        </div>
        <div>
          <Skeleton className="mb-4 h-5 w-44" />
          <CardSkeletonGrid
            count={6}
            columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
          />
        </div>
      </div>
    </div>
  );
}
