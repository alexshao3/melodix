'use client';

import { cn } from '@/lib/cn';

export function AudioVisualizer({ className }: { className?: string }) {
  const bars = 64;
  return (
    <div className={cn('flex h-20 items-end justify-center gap-[3px] px-2', className)}>
      {Array.from({ length: bars }).map((_, i) => {
        const phase = (i * 47) % 100;
        const height = 16 + ((i * 13) % 70);
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-gradient-to-t from-fuchsia-500 via-rose-400 to-cyan-300 opacity-80"
            style={{
              height: `${height}%`,
              animation: `audiowave ${1.2 + (i % 5) * 0.18}s ease-in-out ${(phase / 100) * 1.6}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
