'use client';

import Image from 'next/image';
import { m as motion } from 'framer-motion';
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
      className="group flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3 text-left transition-[transform,background-color] duration-200 hover:-translate-y-1 hover:bg-white/[0.06]"
    >
      {/* Cover frame: solid surface-2 with a single coral edge stroke as
       * the brand cue. The previous fuchsia → purple → indigo gradient
       * was the design audit's #1 example of generic "AI gradient" slop. */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl"
        style={{ background: 'var(--surface-2)' }}
      >
        {playlist.cover ? (
          <Image
            src={playlist.cover}
            alt=""
            fill
            sizes="(min-width: 1280px) 192px, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
