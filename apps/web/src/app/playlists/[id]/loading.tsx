import { HeaderSkeleton, TrackSkeletonRow } from '@melodix/ui';

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton shape="square" />
      <div className="mt-8">
        <TrackSkeletonRow count={10} />
      </div>
    </div>
  );
}
