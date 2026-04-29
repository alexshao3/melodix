'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Spinner } from '@melodix/ui';
import { api } from '@/lib/api';

interface CreatePlaylistDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreatePlaylistDialog({ open, onClose, onCreated }: CreatePlaylistDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (submitting) return;
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createPlaylist(name.trim(), description.trim() || undefined);
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
    <Modal
      open={open}
      onClose={close}
      title="New playlist"
      description="Group tracks into a private or public collection."
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[color:var(--accent-line)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[color:var(--accent-line)] focus:outline-none"
          />
        </label>
        {error && <p className="text-xs text-accent">{error}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {submitting && <Spinner size={14} />}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
