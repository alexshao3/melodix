'use client';

import { m as motion } from 'framer-motion';
import { Headphones, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GradientButton } from '@melodix/ui';
import { AudioVisualizer } from './AudioVisualizer';
import { OrbitingCovers } from './OrbitingCovers';

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-black/30 px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
      {/* Aurora background */}
      <div aria-hidden className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.6),transparent_60%)]"
      />
      <div
        aria-hidden
        className="absolute -inset-1 -z-10 bg-[radial-gradient(circle_at_top,white_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04]"
      />

      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-zinc-300 backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            New • Telegram Mini App is live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Where every beat <br className="hidden sm:block" />
            <span className="text-gradient">finds you.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-xl text-base text-zinc-300 sm:text-lg"
          >
            Discover, play, and curate millions of Creative-Commons tracks. Beautifully fluid,
            deeply personal, and ready inside Telegram.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/discover">
              <GradientButton size="lg" icon={<Play className="h-4 w-4 fill-current" />}>
                Start listening
              </GradientButton>
            </Link>
            <Link href="/discover">
              <GradientButton
                variant="secondary"
                size="lg"
                icon={<Headphones className="h-4 w-4" />}
              >
                Explore moods
              </GradientButton>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex items-center gap-6 text-xs text-zinc-400"
          >
            <div>
              <div className="font-display text-xl font-bold text-white">600K+</div>
              <div>Creative-Commons tracks</div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="font-display text-xl font-bold text-white">∞</div>
              <div>Mood-based playlists</div>
            </div>
            <div className="hidden h-8 w-px bg-white/10 sm:block" />
            <div className="hidden sm:block">
              <div className="font-display text-xl font-bold text-white">100%</div>
              <div>Free to play</div>
            </div>
          </motion.div>
        </div>

        <div className="relative h-[360px] sm:h-[440px]">
          <OrbitingCovers />
          <AudioVisualizer className="pointer-events-none absolute inset-x-0 bottom-0" />
        </div>
      </div>
    </section>
  );
}
