'use client';

import { useEffect, useState } from 'react';
import type { Playlist, Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { TrackList } from '@/components/sections/TrackList';
import { EditableTrackList } from './EditableTrackList';
import { PlaylistOwnerControls } from './PlaylistOwnerControls';

type Slot = 'controls' | 'tracks';

interface PlaylistAuthBoundaryProps {
  slot: Slot;
  playlist: Playlist;
  tracks: Track[];
}

/**
 * Server components don't know who the viewer is (auth lives in
 * `localStorage`), so this client boundary asks `/me` on mount and renders
 * the owner-only UI when ownership is confirmed. Two slots avoid duplicating
 * the auth check across the page header and the track list.
 *
 * - `slot="controls"` — renders the **Edit** button next to the title for
 *   the owner. Renders nothing for everyone else.
 * - `slot="tracks"` — renders the editable track list (reorder + remove)
 *   for the owner, the read-only `TrackList` for everyone else (and during
 *   the initial pre-mount paint, so unauthenticated viewers see no flash).
 */
export function PlaylistAuthBoundary({ slot, playlist, tracks }: PlaylistAuthBoundaryProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('melodix.token');
    if (!token) {
      setResolved(true);
      return;
    }
    api
      .me()
      .then((me) => setIsOwner(me.id === playlist.ownerId))
      .catch(() => setIsOwner(false))
      .finally(() => setResolved(true));
  }, [playlist.ownerId]);

  if (slot === 'controls') {
    return isOwner ? <PlaylistOwnerControls playlist={playlist} /> : null;
  }

  if (!resolved || !isOwner) {
    return <TrackList tracks={tracks} />;
  }

  return <EditableTrackList playlistId={playlist.id} tracks={tracks} />;
}
