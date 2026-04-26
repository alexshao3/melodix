import { cn } from '../lib/cn';

export interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className }: SpinnerProps) {
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-2 border-white/20 border-t-white', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
