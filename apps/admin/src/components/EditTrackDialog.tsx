'use client';

import { useState } from 'react';
import { Modal } from '@melodix/ui';
import { Sparkles } from 'lucide-react';
import type { Track } from '@melodix/shared';
import { adminApi, ApiError } from '@/lib/api';
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
  const [lyrics, setLyrics] = useState(track.lyrics ?? '');
  const [language, setLanguage] = useState('eng');
  const [syncedLyrics, setSyncedLyrics] = useState<string | null>(track.syncedLyrics ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [aligning, setAligning] = useState(false);
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
      // The API treats `lyrics === ""` as "clear" and `undefined` as "leave
      // unchanged", so always send the field — the textarea is bound to a
      // string value, and an empty submission means the admin wants it gone.
      form.append('lyrics', lyrics);
      if (coverFile) form.append('cover', coverFile);
      const updated = await adminApi.updateTrack(track.id, form);
      // Saving lyrics text invalidates any previously-aligned LRC; reflect
      // that in the UI so the admin knows they need to re-sync.
      setSyncedLyrics(updated.syncedLyrics ?? null);
      toast.success('Track updated.');
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const autoSync = async () => {
    setError(null);
    setAligning(true);
    try {
      const updated = await adminApi.autoSyncLyrics(track.id, {
        lyrics: lyrics || undefined,
        language,
      });
      setSyncedLyrics(updated.syncedLyrics ?? null);
      onSaved(updated);
      toast.success('Lyrics synced to audio.');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Auto-sync failed';
      setError(msg);
    } finally {
      setAligning(false);
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
          <span className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest text-zinc-400">
            <span>Lyrics</span>
            <span className="text-[10px] normal-case tracking-normal text-zinc-500">
              plain text · one line per row
            </span>
          </span>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={6}
            placeholder="Paste the song lyrics here — typically copied from the SUNO generation page."
            className="admin-input min-h-[10rem] resize-y font-mono text-xs leading-relaxed"
          />
        </label>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-zinc-300">Auto-sync lyrics to audio (Aeneas)</p>
              <p className="text-[11px] text-zinc-500">
                {syncedLyrics
                  ? 'Synced LRC stored. Re-run to refresh after editing lyrics.'
                  : 'Generates [mm:ss.xx] timestamps so the player can highlight lines as the song plays.'}
              </p>
            </div>
            <button
              type="button"
              disabled={aligning || !lyrics.trim()}
              onClick={autoSync}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-gradient-to-r from-cyan-400/20 via-fuchsia-500/20 to-rose-500/20 px-3 py-1.5 text-[12px] font-semibold text-white hover:from-cyan-400/30 hover:to-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              title={!lyrics.trim() ? 'Add lyrics first' : 'Run forced alignment'}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aligning ? 'Aligning…' : 'Auto-sync'}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-200"
            >
              <option value="eng">English (eng)</option>
              <option value="vie">Vietnamese (vie)</option>
              <option value="cmn">Mandarin (cmn)</option>
              <option value="jpn">Japanese (jpn)</option>
              <option value="kor">Korean (kor)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
            </select>
          </div>
          {syncedLyrics && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-cyan-300 hover:text-cyan-200">
                Show synced LRC
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/5 bg-zinc-950/60 p-2 font-mono text-[10px] leading-snug text-zinc-300">
                {syncedLyrics}
              </pre>
            </details>
          )}
        </div>

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
