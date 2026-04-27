'use client';

import { useCallback, useMemo, useRef } from 'react';
import { cn } from '../lib/cn';

export interface WaveformProps {
  /**
   * Pre-computed amplitude buckets in [0, 1]. Typically ~200 samples
   * generated client-side at upload via `OfflineAudioContext` and stored
   * on `Track.peaks`. When `null` / `undefined`, the parent should fall
   * back to a plain progress bar — this component renders nothing.
   */
  peaks: number[] | null | undefined;
  /** Current playback position in seconds. */
  position: number;
  /** Total track duration in seconds. */
  duration: number;
  /** Called with a target second when the user clicks/drags the bar. */
  onSeek?: (seconds: number) => void;
  /** Called continuously while the user drags; lets parents preview. */
  onScrub?: (seconds: number | null) => void;
  className?: string;
  /** SVG height in px. Width is always 100% of the container. */
  height?: number;
  /** Minimum bar height as a fraction of `height` so flat sections stay visible. */
  minBarFraction?: number;
}

/**
 * SVG-based waveform scrubber. Renders one vertical bar per peak, mirrored
 * around the horizontal center so quiet sections are visibly thinner. The
 * portion of the bar to the left of `position` is filled with the gradient
 * defined by the parent (via the `text-*` color CSS variable on the SVG);
 * the rest is dimmed.
 *
 * Click/drag is treated as a seek — we map pointer X across the SVG width
 * to a fraction of `duration` and emit it via `onSeek` / `onScrub`. We use
 * `setPointerCapture` so a drag that exits the bar still tracks correctly.
 *
 * Why SVG over Canvas: peaks are static for a given track, so we don't need
 * per-frame redraws. SVG is easier to style with Tailwind, scales crisply
 * at any width, and is friendlier to React's reconciliation model (no
 * imperative `useEffect` to redraw on resize).
 */
export function Waveform({
  peaks,
  position,
  duration,
  onSeek,
  onScrub,
  className,
  height = 56,
  minBarFraction = 0.06,
}: WaveformProps) {
  const ref = useRef<SVGSVGElement | null>(null);

  const playedFraction = useMemo(() => {
    if (!duration || !Number.isFinite(duration)) return 0;
    return Math.max(0, Math.min(1, position / duration));
  }, [position, duration]);

  const fractionFromEvent = useCallback((evt: React.PointerEvent<SVGSVGElement>): number => {
    const svg = ref.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onSeek && !onScrub) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = fractionFromEvent(e);
    onScrub?.(f * duration);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onScrub) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const f = fractionFromEvent(e);
    onScrub(f * duration);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const f = fractionFromEvent(e);
    onSeek?.(f * duration);
    onScrub?.(null);
  };

  if (!peaks || peaks.length === 0) return null;

  const bars = peaks.length;
  // Use a fixed viewBox width and let CSS scale it. A wider viewBox lets
  // each bar use ~3 px of width with a 1 px gap and stay crisp at typical
  // PlayerBar sizes (~600–800 px wide).
  const vbWidth = bars * 4;
  const vbHeight = 100;
  const playedX = playedFraction * vbWidth;
  const minH = minBarFraction * vbHeight;

  return (
    <svg
      ref={ref}
      role={onSeek ? 'slider' : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? Math.max(0, Math.round(duration)) : undefined}
      aria-valuenow={onSeek ? Math.max(0, Math.round(position)) : undefined}
      aria-label={onSeek ? 'Seek position' : undefined}
      viewBox={`0 0 ${vbWidth} ${vbHeight}`}
      preserveAspectRatio="none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        'block w-full select-none',
        (onSeek || onScrub) && 'cursor-pointer touch-none',
        className,
      )}
      style={{ height }}
    >
      <defs>
        <clipPath id="wf-clip-played">
          <rect x="0" y="0" width={playedX} height={vbHeight} />
        </clipPath>
        <clipPath id="wf-clip-rest">
          <rect x={playedX} y="0" width={vbWidth - playedX} height={vbHeight} />
        </clipPath>
      </defs>

      {/* Unplayed bars: dim. */}
      <g clipPath="url(#wf-clip-rest)" className="text-zinc-600">
        {peaks.map((p, i) => {
          const h = Math.max(minH, p * vbHeight);
          return (
            <rect
              key={`r-${i}`}
              x={i * 4}
              y={(vbHeight - h) / 2}
              width={3}
              height={h}
              fill="currentColor"
              rx={1.2}
            />
          );
        })}
      </g>

      {/* Played bars: bright accent. The parent decides the color via a
          Tailwind `text-*` class. */}
      <g clipPath="url(#wf-clip-played)">
        {peaks.map((p, i) => {
          const h = Math.max(minH, p * vbHeight);
          return (
            <rect
              key={`p-${i}`}
              x={i * 4}
              y={(vbHeight - h) / 2}
              width={3}
              height={h}
              fill="currentColor"
              rx={1.2}
            />
          );
        })}
      </g>
    </svg>
  );
}
