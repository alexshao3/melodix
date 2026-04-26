'use client';

import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface MarqueeProps {
  children: ReactNode;
  speed?: number; // seconds per loop
  reverse?: boolean;
  className?: string;
}

export function Marquee({ children, speed = 30, reverse = false, className }: MarqueeProps) {
  return (
    <div className={cn('group relative flex w-full overflow-hidden', className)}>
      <div
        className={cn('flex shrink-0 gap-8 whitespace-nowrap pr-8', reverse ? 'animate-marquee-reverse' : 'animate-marquee')}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={cn('flex shrink-0 gap-8 whitespace-nowrap pr-8', reverse ? 'animate-marquee-reverse' : 'animate-marquee')}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
    </div>
  );
}
