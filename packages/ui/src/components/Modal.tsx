'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /**
   * Width breakpoint for the modal panel. Defaults to `md` (~28rem). Use
   * `lg` for editors that hold longer forms.
   */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Tiny accessible-ish modal — no portal-mounting library, no animation
 * dependency beyond what the host app already uses for its own menus. We
 * keep it minimal so it works identically inside the Mini App's restricted
 * WebView.
 *
 * Closes on Escape or backdrop click. Locks body scroll while open.
 */
export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 pt-16 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="melodix-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        className={`relative w-full ${SIZE_MAP[size]} rounded-3xl border border-white/10 bg-[rgb(var(--background))] p-6 shadow-2xl shadow-black/40`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="melodix-modal-title"
              className="font-display text-xl font-semibold tracking-tight text-white"
            >
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
