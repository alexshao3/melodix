'use client';

import Image from 'next/image';
import { m as motion } from 'framer-motion';
import { DEMO_HERO_COVERS, DEMO_HERO_CENTER } from '@/lib/demoCovers';

const LAYOUT = [
  { size: 120, top: '0%', left: '50%', delay: 0 },
  { size: 96, top: '20%', left: '85%', delay: 0.2 },
  { size: 110, top: '60%', left: '85%', delay: 0.4 },
  { size: 130, top: '80%', left: '50%', delay: 0.6 },
  { size: 96, top: '60%', left: '15%', delay: 0.8 },
  { size: 110, top: '20%', left: '15%', delay: 1.0 },
] as const;

const COVERS = LAYOUT.map((l, i) => ({ ...l, src: DEMO_HERO_COVERS[i % DEMO_HERO_COVERS.length] }));

export function OrbitingCovers() {
  return (
    <div className="relative h-full w-full">
      {/* Center disc — solid coral glow + a still cover. The previous
       * spinning rainbow blur (`animate-spin-slow` + `from-cyan via-fuchsia
       * to-rose` gradient) was the section's loudest "AI slop" tell. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-full opacity-60 blur-3xl"
            style={{ background: 'var(--accent-soft)' }}
          />
          <div className="absolute inset-3 overflow-hidden rounded-full ring-1 ring-white/15">
            <Image
              src={DEMO_HERO_CENTER}
              alt=""
              fill
              sizes="(min-width: 640px) 256px, 224px"
              priority
              fetchPriority="high"
              className="object-cover"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/35 to-transparent" />
          </div>
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-4 ring-white/10" />
          <div
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--accent-bg)' }}
          />
        </div>
      </div>

      {/* Floating album covers — opacity-only fade-in, no infinite-y bob.
       * The bobbing loop was running on six elements forever and torched
       * the main thread; the audit's huashu §2 rule "no perpetual motion
       * outside the Boom" cuts it. */}
      {COVERS.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.45,
            delay: 1.2 + i * 0.06,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          style={{
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/15"
        >
          <Image src={c.src} alt="" fill sizes={`${c.size}px`} className="object-cover" />
        </motion.div>
      ))}
    </div>
  );
}
