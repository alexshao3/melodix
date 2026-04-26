'use client';

import { cn } from '../lib/cn';

export interface AudioWaveProps {
  bars?: number;
  className?: string;
  color?: string;
}

export function AudioWave({ bars = 32, className, color = 'bg-emerald-400' }: AudioWaveProps) {
  return (
    <div className={cn('flex h-12 items-end gap-[3px]', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn('w-[3px] rounded-full', color)}
          style={{
            animation: `audiowave 1.2s ease-in-out ${(i * 0.04) % 1.2}s infinite`,
            height: `${20 + ((i * 13) % 80)}%`,
          }}
        />
      ))}
    </div>
  );
}
