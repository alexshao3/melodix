'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, GripVertical, Pause, Play, Trash2 } from 'lucide-react';
import { AudioWave } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { usePlayerControls, usePlayerState } from '@/components/player/PlayerProvider';
import { formatDuration } from '@melodix/shared';
import { api } from '@/lib/api';

interface EditableTrackListProps {
  playlistId: string;
  tracks: Track[];
}

/**
 * Track listing that exposes per-row controls only the playlist owner needs:
 * drag-to-reorder, move-up/down (keyboard a11y fallback), and remove.
 *
 * Reorder uses framer-motion's `Reorder` primitives (already in our deps),
 * so we get pointer + touch + keyboard support without adding `@dnd-kit` or
 * similar. The persisted order is committed to the API on `onReorder`'s
 * settle (after the user releases) — we keep the previous server order as
 * a snapshot and roll back if the request fails.
 */
export function EditableTrackList({ playlistId, tracks: initial }: EditableTrackListProps) {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>(initial);
  const [persisted, setPersisted] = useState<Track[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { currentTrack, isPlaying } = usePlayerState();
  const { play, toggle } = usePlayerControls();

  // Commit the current local order to the server. Snapshots the previous
  // persisted order so a failed request rolls UI state back deterministically.
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

  const move = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= tracks.length) return;
    const next = [...tracks];
    const [moved] = next.splice(idx, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    setTracks(next);
    void commitOrder(next);
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
      // Keep `persisted` in sync with the server — otherwise a subsequent
      // failed reorder would roll the UI back to a snapshot that still
      // contains the deleted track.
      setPersisted((prev) => prev.filter((t) => t.id !== track.id));
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-400">
        This playlist has no tracks yet. Add some from any album, artist, or search result.
      </div>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={tracks}
      // framer-motion fires `onReorder` continuously during a drag; we keep
      // the local order in sync but defer the API call to `onDragEnd` on
      // each row, which fires once per pointer release.
      onReorder={setTracks}
      className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02]"
    >
      {tracks.map((track, idx) => (
        <EditableTrackRow
          key={track.id}
          track={track}
          idx={idx}
          total={tracks.length}
          busy={busy === track.id}
          isCurrent={currentTrack?.id === track.id}
          isPlaying={currentTrack?.id === track.id && isPlaying}
          onPlay={() => (currentTrack?.id === track.id ? toggle() : play(track, tracks))}
          onDragSettle={() => void commitOrder(tracks)}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
          onRemove={() => void removeTrack(track)}
        />
      ))}
    </Reorder.Group>
  );
}

interface EditableTrackRowProps {
  track: Track;
  idx: number;
  total: number;
  busy: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDragSettle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function EditableTrackRow({
  track,
  idx,
  total,
  busy,
  isCurrent,
  isPlaying,
  onPlay,
  onDragSettle,
  onMoveUp,
  onMoveDown,
  onRemove,
}: EditableTrackRowProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragSettle}
      className="flex items-center gap-3 bg-zinc-950/0 px-3 py-2 sm:gap-4 sm:px-4"
    >
      <button
        type="button"
        // `onPointerDown` (rather than onClick) is what framer-motion expects
        // to start a manual drag. The cursor swaps to grabbing while held.
        onPointerDown={(e) => dragControls.start(e)}
        className="hidden h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200 active:cursor-grabbing sm:flex"
        aria-label={`Drag to reorder ${track.title}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onPlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={isPlaying ? 'Pause' : `Play ${track.title}`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm font-medium ${isCurrent ? 'text-cyan-300' : 'text-white'}`}
          >
            {track.title}
          </span>
          {isPlaying && <AudioWave className="text-cyan-300" />}
        </div>
        <div className="truncate text-xs text-zinc-400">
          <Link href={`/artists/${track.artistId}`} className="hover:text-zinc-200 hover:underline">
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
          onClick={onMoveUp}
          disabled={idx === 0 || busy}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 sm:hidden"
          aria-label={`Move ${track.title} up`}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={idx === total - 1 || busy}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 sm:hidden"
          aria-label={`Move ${track.title} down`}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30"
          aria-label={`Remove ${track.title} from playlist`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}
