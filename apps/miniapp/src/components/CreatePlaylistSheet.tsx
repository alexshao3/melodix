'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/**
 * Slim bottom sheet for creating a playlist inside the Mini App. We avoid
 * importing the web `Modal` here because the Mini App targets a much smaller
 * viewport — a top-down sheet wastes space — and Telegram WebView is happier
 * with simple stacking contexts.
 */
export function CreatePlaylistSheet({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    if (submitting) return;
    setName('');
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createPlaylist(name.trim());
      onCreated?.();
      close();
      router.push(`/playlists/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <form
        onSubmit={submit}
        className="relative w-full rounded-t-3xl border-t border-white/10 bg-[#0a0a0d] p-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">New playlist</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] uppercase tracking-widest text-zinc-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            maxLength={120}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="mt-4 w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
