'use client';

import { motion } from 'framer-motion';
import { ListMusic } from 'lucide-react';
import type { Playlist } from '@melodix/shared';

export interface PlaylistCardProps {
  playlist: Playlist;
  onClick?: (playlist: Playlist) => void;
  index?: number;
}

export function PlaylistCard({ playlist, onClick, index }: PlaylistCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(playlist)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index ?? 0) * 0.03 }}
      whileHover={{ y: -4 }}
      className="group flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700">
        {playlist.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.cover}
            alt={playlist.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ListMusic className="h-12 w-12 text-white/70" />
          </div>
        )}
      </div>
      <div className="min-w-0 px-1">
        <div className="truncate text-sm font-semibold text-white">{playlist.name}</div>
        <div className="truncate text-xs text-zinc-400">
          {playlist.trackCount} tracks{playlist.ownerName ? ` • ${playlist.ownerName}` : ''}
        </div>
      </div>
    </motion.button>
  );
}
