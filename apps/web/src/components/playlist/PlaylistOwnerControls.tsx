'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { Playlist } from '@melodix/shared';
import { EditPlaylistDialog } from './EditPlaylistDialog';

interface PlaylistOwnerControlsProps {
  playlist: Playlist;
}

/**
 * Renders the "Edit" button next to the playlist title and lazily mounts the
 * `EditPlaylistDialog` when clicked. Mounted only for the owner — the parent
 * server component decides who's allowed to see it.
 */
export function PlaylistOwnerControls({ playlist }: PlaylistOwnerControlsProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      {open && (
        <EditPlaylistDialog open={open} onClose={() => setOpen(false)} playlist={playlist} />
      )}
    </>
  );
}
