'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Spinner } from '@melodix/ui';
import type { Playlist } from '@melodix/shared';
import { api } from '@/lib/api';

interface EditPlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  playlist: Playlist;
}

export function EditPlaylistDialog({ open, onClose, playlist }: EditPlaylistDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? '');
  const [cover, setCover] = useState(playlist.cover ?? '');
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting || deleting) return;
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updatePlaylist(playlist.id, {
        name: name.trim(),
        description: description.trim() || null,
        cover: cover.trim() || null,
        isPublic,
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete playlist "${playlist.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deletePlaylist(playlist.id);
      onClose();
      router.push('/library');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Edit playlist" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[color:var(--accent-line)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[color:var(--accent-line)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Cover URL
          </span>
          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="https://…"
            maxLength={2048}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[color:var(--accent-line)] focus:outline-none"
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-white">Public</span>
            <span className="block text-xs text-zinc-400">
              When off, only you can see this playlist.
            </span>
          </span>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-5 w-5 accent-cyan-400"
          />
        </label>
        {error && <p className="text-xs text-accent">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting || deleting}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-accent hover:bg-accent-soft hover:text-accent disabled:opacity-50"
          >
            {deleting && <Spinner size={14} />}
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              disabled={submitting || deleting}
              className="rounded-full px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting || deleting}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {submitting && <Spinner size={14} />}
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
