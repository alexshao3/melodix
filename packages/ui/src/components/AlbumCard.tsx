'use client';

import { motion } from 'framer-motion';
import type { Album } from '@melodix/shared';

export interface AlbumCardProps {
  album: Album;
  onClick?: (album: Album) => void;
  index?: number;
}

export function AlbumCard({ album, onClick, index }: AlbumCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(album)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index ?? 0) * 0.03 }}
      whileHover={{ y: -4 }}
      className="group flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800">
        {album.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover}
            alt={album.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="min-w-0 px-1">
        <div className="truncate text-sm font-semibold text-white">{album.name}</div>
        <div className="truncate text-xs text-zinc-400">{album.artistName}</div>
      </div>
    </motion.button>
  );
}
