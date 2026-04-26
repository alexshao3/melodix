import { cn } from '../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base shimmer skeleton. Honours `prefers-reduced-motion` automatically via
 * the `motion-reduce:animate-none` Tailwind variant.
 */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-xl bg-white/5',
        'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r',
        'before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-[shimmer_1.6s_linear_infinite] motion-reduce:before:animate-none',
        className,
      )}
      {...rest}
    />
  );
}

export interface TrackSkeletonRowProps {
  count?: number;
}

export function TrackSkeletonRow({ count = 8 }: TrackSkeletonRowProps) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl px-3 py-2">
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5 rounded" />
            <Skeleton className="h-2.5 w-1/4 rounded" />
          </div>
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

export interface CardSkeletonGridProps {
  count?: number;
  shape?: 'square' | 'circle';
  /** Tailwind grid-cols utility. */
  columns?: string;
}

/**
 * Generic grid of placeholder cards (artwork + 2 lines). Use `shape="circle"`
 * for artist grids.
 */
export function CardSkeletonGrid({
  count = 8,
  shape = 'square',
  columns = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
}: CardSkeletonGridProps) {
  return (
    <div className={cn('grid gap-3', columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3">
          <Skeleton
            className={cn(
              'aspect-square w-full',
              shape === 'circle' ? 'rounded-full' : 'rounded-xl',
            )}
          />
          <div className="space-y-2 px-1">
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page header skeleton matching the album/artist/playlist hero layout.
 */
export function HeaderSkeleton({ shape = 'square' }: { shape?: 'square' | 'circle' }) {
  return (
    <div className="relative mt-2 flex flex-col items-start gap-6 rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:flex-row sm:items-end sm:px-10">
      <Skeleton
        className={cn(
          'h-44 w-44 shrink-0 shadow-2xl shadow-black/40',
          shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        )}
      />
      <div className="flex w-full flex-col gap-3">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-10 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
