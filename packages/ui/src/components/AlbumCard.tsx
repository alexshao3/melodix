'use client';

import Image from 'next/image';
import { m as motion } from 'framer-motion';
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
      className="group flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3 text-left transition-[transform,background-color] duration-200 hover:-translate-y-1 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800">
        {album.cover ? (
          <Image
            src={album.cover}
            alt=""
            fill
            sizes="(min-width: 1280px) 192px, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
