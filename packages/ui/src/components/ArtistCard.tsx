'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import type { Artist } from '@melodix/shared';
import { formatNumber } from '@melodix/shared';

export interface ArtistCardProps {
  artist: Artist;
  onClick?: (artist: Artist) => void;
  index?: number;
}

export function ArtistCard({ artist, onClick, index }: ArtistCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(artist)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index ?? 0) * 0.03 }}
      whileHover={{ y: -4 }}
      className="group flex w-full flex-col items-center gap-3 rounded-2xl bg-white/[0.03] p-4 text-center transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-zinc-800">
        {artist.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.image}
            alt={artist.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-12 w-12 text-zinc-500" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{artist.name}</div>
        {artist.followers ? (
          <div className="truncate text-xs text-zinc-400">{formatNumber(artist.followers)} followers</div>
        ) : (
          <div className="truncate text-xs text-zinc-400">Artist</div>
        )}
      </div>
    </motion.button>
  );
}
