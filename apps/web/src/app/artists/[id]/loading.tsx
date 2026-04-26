import { HeaderSkeleton, TrackSkeletonRow } from '@melodix/ui';

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton shape="circle" />
      <div className="mt-8">
        <TrackSkeletonRow count={8} />
      </div>
    </div>
  );
}
