'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X } from 'lucide-react';
import type { Playlist } from '@melodix/shared';
import { api } from '@/lib/api';

interface PlaylistEditSheetProps {
  playlist: Playlist;
  isOwner: boolean;
}

/**
 * Trigger button + bottom sheet that lets the playlist owner rename, swap the
 * cover, toggle visibility, or delete the playlist from inside the Mini App.
 * Track reordering is intentionally web-only for now (touch DnD inside
 * Telegram's WebView is fiddly and not worth a dedicated library yet).
 */
export function PlaylistEditSheet({ playlist, isOwner }: PlaylistEditSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? '');
  const [cover, setCover] = useState(playlist.cover ?? '');
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  const close = () => {
    if (busy) return;
    setError(null);
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.updatePlaylist(playlist.id, {
        name: name.trim(),
        description: description.trim() || null,
        cover: cover.trim() || null,
        isPublic,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${playlist.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePlaylist(playlist.id);
      setOpen(false);
      router.push('/library');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 active:scale-95"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <form
            onSubmit={submit}
            className="relative max-h-[85vh] w-full overflow-auto rounded-t-3xl border-t border-white/10 bg-[#0a0a0d] p-5"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Edit playlist</h2>
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
                required
                maxLength={120}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-[11px] uppercase tracking-widest text-zinc-400">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={2000}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-[11px] uppercase tracking-widest text-zinc-400">Cover URL</span>
              <input
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="https://…"
                maxLength={2048}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-sm text-white">Public</span>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-5 w-5 accent-cyan-400"
              />
            </label>

            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-rose-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="submit"
                disabled={!name.trim() || busy}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
