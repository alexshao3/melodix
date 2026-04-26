'use client';

import { useEffect, useState } from 'react';
import type { Playlist } from '@melodix/shared';
import { api } from '@/lib/api';
import { PlaylistEditSheet } from './PlaylistEditSheet';

/**
 * Mini App auth boundary — checks ownership of the current playlist on mount
 * (auth lives in `localStorage`, invisible to the server component) and
 * conditionally renders the edit sheet only for the owner.
 */
export function PlaylistOwnerGate({ playlist }: { playlist: Playlist }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('melodix.token');
    if (!t) return;
    api
      .me()
      .then((me) => setIsOwner(me.id === playlist.ownerId))
      .catch(() => setIsOwner(false));
  }, [playlist.ownerId]);

  return <PlaylistEditSheet playlist={playlist} isOwner={isOwner} />;
}
