import type { SVGProps } from 'react';
import { cn } from '../lib/cn';

export interface WordmarkProps {
  className?: string;
  /** Size of the trailing accent dot relative to the wordmark, default 0.18em. */
  accentSize?: string;
  /** Set to false to drop the trailing coral dot (e.g. when used inside an
   *  already-coloured pill). Defaults to true. */
  accent?: boolean;
}

/**
 * Melodix wordmark. Set in the Fraunces variable display family with a
 * tightened tracking and a single coral full-stop as the only ornament —
 * the "Build" direction's signature: type-led, one accent moment, no
 * gradient. Render inside any element that controls font-size; the
 * wordmark scales with `1em` so callers can size it via Tailwind text
 * utilities.
 */
export function Wordmark({ className, accentSize = '0.18em', accent = true }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-display font-semibold lowercase leading-none tracking-[-0.04em]',
        className,
      )}
      aria-label="Melodix"
    >
      melodix
      {accent ? (
        <span
          aria-hidden
          className="ml-[0.04em] inline-block align-baseline"
          style={{
            color: 'var(--accent-bg)',
            fontSize: accentSize,
            transform: 'translateY(-0.06em)',
          }}
        >
          ●
        </span>
      ) : null}
    </span>
  );
}

/**
 * Square monomark used in tight chrome (sidebar, favicon, top-bar). A
 * coral rounded-square plate with a custom angular `M` cut out — the
 * geometry is hand-tuned so the inner counters align to a 4-px grid
 * regardless of size. No gradients, no shadow rings. The previous
 * `Sparkles`-in-gradient placeholder was the design audit's #1 brand-asset
 * complaint.
 */
export function Monomark({ className, ...rest }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Melodix"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...rest}
    >
      <rect width="32" height="32" rx="8" fill="var(--accent-bg)" />
      {/* Angular M: outer strokes 3px wide, inner valley snaps at y=18 */}
      <path
        d="M 7 9 L 7 23 L 10 23 L 10 14 L 16 23 L 22 14 L 22 23 L 25 23 L 25 9 L 22 9 L 16 18 L 10 9 Z"
        fill="var(--accent-fg)"
      />
    </svg>
  );
}
