'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Pause, Play, Trash2 } from 'lucide-react';
import type { Track } from '@melodix/shared';
import { formatDuration } from '@melodix/shared';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { usePlayerControls, usePlayerState } from './PlayerProvider';

interface EditablePlaylistTracksProps {
  playlistId: string;
  tracks: Track[];
}

/**
 * Owner-only Mini App track list with drag-to-reorder + remove inline.
 *
 * Built on framer-motion's `Reorder` (already in our deps) so we get touch
 * + pointer support inside Telegram WebView without adding a dedicated DnD
 * library. Drag is gated behind an explicit grip handle on the left so the
 * row stays normally tappable for play/pause.
 */
export function EditablePlaylistTracks({
  playlistId,
  tracks: initial,
}: EditablePlaylistTracksProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initial);
  const [persisted, setPersisted] = useState<Track[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const commitOrder = async (next: Track[]) => {
    if (next.map((t) => t.id).join(',') === persisted.map((t) => t.id).join(',')) {
      return;
    }
    const previous = persisted;
    setPersisted(next);
    try {
      await api.reorderPlaylist(
        playlistId,
        next.map((t) => t.id),
      );
      startTransition(() => router.refresh());
    } catch {
      setPersisted(previous);
      setTracks(previous);
    }
  };

  const removeTrack = async (track: Track) => {
    if (!confirm(`Remove "${track.title}" from this playlist?`)) return;
    setBusy(track.id);
    try {
      await api.removePlaylistTrack(playlistId, track.id);
      // Functional updates so an in-flight drag-reorder that resolves
      // between the API call and these setters doesn't get clobbered
      // by a stale closure capture of `tracks`.
      setTracks((prev) => prev.filter((t) => t.id !== track.id));
      setPersisted((prev) => prev.filter((t) => t.id !== track.id));
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.04] px-3 py-6 text-center text-xs text-zinc-400">
        This playlist has no tracks yet.
      </div>
    );
  }

  return (
    <Reorder.Group axis="y" values={tracks} onReorder={setTracks} className="flex flex-col gap-1">
      {tracks.map((track) => (
        <EditableMiniRow
          key={track.id}
          track={track}
          tracks={tracks}
          busy={busy === track.id}
          onDragSettle={() => void commitOrder(tracks)}
          onRemove={() => void removeTrack(track)}
        />
      ))}
    </Reorder.Group>
  );
}

interface EditableMiniRowProps {
  track: Track;
  tracks: Track[];
  busy: boolean;
  onDragSettle: () => void;
  onRemove: () => void;
}

function EditableMiniRow({ track, tracks, busy, onDragSettle, onRemove }: EditableMiniRowProps) {
  const { play, toggle } = usePlayerControls();
  const { currentTrack, isPlaying } = usePlayerState();
  const dragControls = useDragControls();
  const active = currentTrack?.id === track.id;
  const playing = active && isPlaying;

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragSettle}
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
        active ? 'bg-white/10' : 'bg-white/[0.02]',
      )}
    >
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-zinc-500 active:cursor-grabbing"
        aria-label={`Drag to reorder ${track.title}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => (active ? toggle() : play(track, tracks))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-200 active:bg-white/10"
        aria-label={playing ? 'Pause' : `Play ${track.title}`}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={cn('truncate text-sm font-semibold', active ? 'text-cyan-300' : 'text-white')}
        >
          {track.title}
        </div>
        <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
      </div>
      <span className="text-[11px] tabular-nums text-zinc-500">
        {formatDuration(track.duration)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors active:bg-rose-500/10 active:text-rose-300 disabled:opacity-30"
        aria-label={`Remove ${track.title} from playlist`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}
