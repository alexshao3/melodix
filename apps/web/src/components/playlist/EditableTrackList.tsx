'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Pause, Play, Trash2 } from 'lucide-react';
import { AudioWave } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { usePlayer } from '@/components/player/PlayerProvider';
import { formatDuration } from '@melodix/shared';
import { api } from '@/lib/api';

interface EditableTrackListProps {
  playlistId: string;
  tracks: Track[];
}

/**
 * Track listing that exposes per-row controls only the playlist owner needs:
 * move-up, move-down, and remove. Reorder uses up/down arrows rather than
 * drag-and-drop on purpose — we want the editor to work identically inside
 * the Mini App's WebView (touch + small viewport) without dragging an extra
 * library into the bundle.
 */
export function EditableTrackList({ playlistId, tracks: initial }: EditableTrackListProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { currentTrack, isPlaying, play, toggle } = usePlayer();

  const persistOrder = async (next: Track[]) => {
    setTracks(next);
    try {
      await api.reorderPlaylist(
        playlistId,
        next.map((t) => t.id),
      );
      startTransition(() => router.refresh());
    } catch {
      setTracks(initial);
    }
  };

  const move = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= tracks.length) return;
    const next = [...tracks];
    const [moved] = next.splice(idx, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    void persistOrder(next);
  };

  const removeTrack = async (track: Track) => {
    if (!confirm(`Remove "${track.title}" from this playlist?`)) return;
    setBusy(track.id);
    try {
      await api.removePlaylistTrack(playlistId, track.id);
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  return (
    <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02]">
      {tracks.map((track, idx) => {
        const active = currentTrack?.id === track.id;
        const playing = active && isPlaying;
        return (
          <li key={track.id} className="flex items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4">
            <button
              type="button"
              onClick={() => (active ? toggle() : play(track, tracks))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={playing ? 'Pause' : `Play ${track.title}`}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`truncate text-sm font-medium ${
                    active ? 'text-cyan-300' : 'text-white'
                  }`}
                >
                  {track.title}
                </span>
                {playing && <AudioWave className="text-cyan-300" />}
              </div>
              <div className="truncate text-xs text-zinc-400">
                <Link
                  href={`/artists/${track.artistId}`}
                  className="hover:text-zinc-200 hover:underline"
                >
                  {track.artistName}
                </Link>
              </div>
            </div>
            <span className="hidden text-xs tabular-nums text-zinc-500 sm:block">
              {formatDuration(track.duration ?? 0)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0 || busy === track.id}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                aria-label={`Move ${track.title} up`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === tracks.length - 1 || busy === track.id}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                aria-label={`Move ${track.title} down`}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void removeTrack(track)}
                disabled={busy === track.id}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30"
                aria-label={`Remove ${track.title} from playlist`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
      {tracks.length === 0 && (
        <li className="px-4 py-8 text-center text-sm text-zinc-400">
          This playlist has no tracks yet. Add some from any album, artist, or search result.
        </li>
      )}
    </ul>
  );
}
