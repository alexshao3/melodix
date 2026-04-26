'use client';

import { motion } from 'framer-motion';

const COVERS = [
  { seed: 'neon', size: 120, top: '0%', left: '50%', delay: 0, dist: 160 },
  { seed: 'velvet', size: 96, top: '20%', left: '85%', delay: 0.2, dist: 140 },
  { seed: 'cobalt', size: 110, top: '60%', left: '85%', delay: 0.4, dist: 150 },
  { seed: 'bloom', size: 130, top: '80%', left: '50%', delay: 0.6, dist: 170 },
  { seed: 'static', size: 96, top: '60%', left: '15%', delay: 0.8, dist: 140 },
  { seed: 'glassway', size: 110, top: '20%', left: '15%', delay: 1.0, dist: 150 },
];

export function OrbitingCovers() {
  return (
    <div className="relative h-full w-full">
      {/* Center disc */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative h-56 w-56 sm:h-64 sm:w-64">
          <div className="absolute inset-0 animate-spin-slow rounded-full bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-rose-500 opacity-70 blur-2xl" />
          <div className="absolute inset-3 overflow-hidden rounded-full ring-1 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/melodix-hero/600/600"
              alt=""
              className="h-full w-full animate-spin-slow object-cover"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/30 to-transparent" />
          </div>
          <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-4 ring-white/10" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
        </div>
      </motion.div>

      {/* Floating album covers */}
      {COVERS.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -8, 0, 8, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: c.delay },
            scale: { duration: 0.5, delay: c.delay },
            y: {
              duration: 6 + i * 0.4,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
              delay: c.delay,
            },
          }}
          style={{
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size,
            transform: 'translate(-50%, -50%)',
          }}
          className="absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/15 backdrop-blur"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://picsum.photos/seed/melodix-${c.seed}/240/240`}
            alt=""
            className="h-full w-full object-cover"
          />
        </motion.div>
      ))}
    </div>
  );
}
