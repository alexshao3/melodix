'use client';

import { useRouter } from 'next/navigation';
import type { Playlist } from '@melodix/shared';
import { PlaylistCard } from '@melodix/ui';

export function PlaylistGrid({ playlists }: { playlists: Playlist[] }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {playlists.map((p, i) => (
        <PlaylistCard
          key={p.id}
          playlist={p}
          index={i}
          onClick={() => router.push(`/playlists/${p.id}`)}
        />
      ))}
    </div>
  );
}
