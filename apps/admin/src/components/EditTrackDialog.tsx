'use client';

import { useState } from 'react';
import { Modal } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { adminApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

export function EditTrackDialog({
  track,
  onClose,
  onSaved,
}: {
  track: Track;
  onClose: () => void;
  onSaved: (updated: Track) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(track.title);
  const [artistName, setArtistName] = useState(track.artistName);
  const [genre, setGenre] = useState(track.genre ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('artistName', artistName);
      form.append('genre', genre);
      if (coverFile) form.append('cover', coverFile);
      const updated = await adminApi.updateTrack(track.id, form);
      toast.success('Track updated.');
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit track" size="lg">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="admin-input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">Artist</span>
          <input
            required
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className="admin-input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">Genre</span>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. ambient"
            className="admin-input"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
            Replace cover (optional)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white hover:file:bg-white/15"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
