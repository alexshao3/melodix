'use client';

import { useEffect, useState } from 'react';
import type { Playlist, Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from './MiniTrackRow';
import { EditablePlaylistTracks } from './EditablePlaylistTracks';

interface MiniTracksAuthBoundaryProps {
  playlist: Playlist;
  tracks: Track[];
}

/**
 * Mini App equivalent of the web `PlaylistAuthBoundary` "tracks" slot:
 * checks ownership client-side (auth lives in `localStorage`) and renders
 * the drag-to-reorder editable list only for the owner. Everyone else
 * (and the initial pre-mount paint for unauthenticated visitors) gets the
 * normal read-only `MiniTrackRow` list so playback always works.
 */
export function MiniTracksAuthBoundary({ playlist, tracks }: MiniTracksAuthBoundaryProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? window.localStorage.getItem('melodix.token') : null;
    if (!token) {
      setResolved(true);
      return;
    }
    api
      .me()
      .then((me) => setIsOwner(me?.id === playlist.ownerId))
      .catch(() => setIsOwner(false))
      .finally(() => setResolved(true));
  }, [playlist.ownerId]);

  if (!resolved || !isOwner) {
    return (
      <div className="flex flex-col">
        {tracks.map((t, i) => (
          <MiniTrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    );
  }

  return <EditablePlaylistTracks playlistId={playlist.id} tracks={tracks} />;
}
