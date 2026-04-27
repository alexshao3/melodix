'use client';

import { useRouter } from 'next/navigation';
import { AlbumCard } from '@melodix/ui';
import type { Album } from '@melodix/shared';

/**
 * Wraps `AlbumCard` with router-based navigation. Used by the artist
 * detail page to list discography. Lives in the artists folder because
 * it's the only consumer today; promote to `packages/ui` if a second
 * caller appears.
 */
export function AlbumGrid({ albums }: { albums: Album[] }) {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {albums.map((album, i) => (
        <AlbumCard
          key={album.id}
          album={album}
          index={i}
          onClick={(a) => router.push(`/albums/${a.id}`)}
        />
      ))}
    </div>
  );
}
