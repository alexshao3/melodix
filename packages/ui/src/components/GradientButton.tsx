'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 text-black hover:shadow-emerald-500/30 hover:shadow-2xl',
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
