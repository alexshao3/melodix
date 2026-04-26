import { CardSkeletonGrid, Skeleton, TrackSkeletonRow } from '@melodix/ui';

export default function Loading() {
  return (
    <div>
      <Skeleton className="mt-2 h-10 w-48" />
      <div className="mt-8 space-y-10">
        <div>
          <Skeleton className="mb-4 h-5 w-40" />
          <CardSkeletonGrid count={6} />
        </div>
        <div>
          <Skeleton className="mb-4 h-5 w-32" />
          <TrackSkeletonRow count={6} />
        </div>
      </div>
    </div>
  );
}
