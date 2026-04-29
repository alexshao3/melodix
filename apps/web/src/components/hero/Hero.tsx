'use client';

import { m as motion } from 'framer-motion';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { OrbitingCovers } from './OrbitingCovers';

/**
 * Hero — Build re-skin (PR #2 of the design audit).
 *
 * The previous hero ran nine simultaneous animations against a tri-colour
 * aurora and a "600K+ · ∞ · 100%" filler-stats block. Per the audit this
 * was the loudest "AI slop" surface in the app. This rewrite enforces a
 * Slow-Fast-Boom-Stop arc:
 *
 * - Slow (0 → 0.6 s): headline fades up, body copy follows.
 * - Fast (0.4 → 0.9 s): the two CTAs slide in.
 * - Boom (1.1 → 1.5 s): `OrbitingCovers` pops once at scale 0.92 → 1, the
 *   single energetic moment in the section. Everything else has stopped
 *   animating by then.
 * - Stop: nothing keeps moving. No infinite loops, no aurora pan.
 *
 * Only one accent colour is used (the brand coral, applied to a single
 * word in the headline and to the primary CTA). The "New • Telegram Mini
 * App is live" badge and the filler stats block are gone. The
 * `AudioVisualizer` is intentionally not rendered here — its perpetual
 * motion fights the Stop step.
 */
export function Hero() {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-white/5 px-6 py-14 sm:px-10 sm:py-20 lg:py-24"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* Aurora — single coral pool, no gradient-pan loop. */}
      <div aria-hidden className="aurora absolute inset-0 -z-10 opacity-60" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.55),transparent_60%)]"
      />

      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl"
          >
            Music with <br className="hidden sm:block" />
            <span
              className="italic text-accent"
              style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1' }}
            >
              taste
            </span>
            <span className="text-white">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400 sm:text-base"
          >
            A streaming surface for Creative-Commons catalogues. Hand-picked, properly typeset, and
            quiet enough to actually listen to.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold tracking-tight transition-colors"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent-fg)' }}
            >
              <Play className="h-4 w-4 fill-current" />
              Start listening
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white"
            >
              Browse the catalogue
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.55,
            delay: 1.1,
            ease: [0.16, 1, 0.3, 1] /* easeOutExpo: the Boom curve */,
          }}
          className="relative h-[360px] sm:h-[440px]"
        >
          <OrbitingCovers />
        </motion.div>
      </div>
    </section>
  );
}
