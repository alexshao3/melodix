'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { m as motion } from 'framer-motion';
import { cn } from '../lib/cn';

interface GradientButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', icon, ...rest }, ref) => {
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
    } as const;

    // Despite the legacy `GradientButton` name (kept for back-compat with
    // existing imports), the primary variant now renders a solid coral
    // surface — the Build re-skin replaced the multi-stop gradient with the
    // single brand accent. The shadow uses the same coral via
    // `var(--accent-bg)` so it tints toward the surface rather than
    // bleeding into a second hue.
    const variantClasses = {
      primary: 'bg-accent text-[color:var(--accent-fg)] hover:bg-accent-hover',
      secondary: 'bg-white/10 text-white backdrop-blur-md hover:bg-white/15 border border-white/10',
      ghost: 'bg-transparent text-white hover:bg-white/5',
    } as const;

    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0, scale: 0.98 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all',
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...(rest as React.ComponentProps<typeof motion.button>)}
      >
        {icon}
        {children}
      </motion.button>
    );
  },
);

GradientButton.displayName = 'GradientButton';
