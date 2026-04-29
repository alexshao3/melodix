import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Disc3 } from 'lucide-react';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniAlbum({ params }: PageProps) {
  const { id } = await params;
  const data = await api.album(id);
  if (!data) notFound();
  const { album, tracks } = data;
  const releaseYear = album.releaseDate ? album.releaseDate.slice(0, 4) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600">
            {album.cover ? (
              <Image src={album.cover} alt="" fill sizes="80px" priority className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Disc3 className="h-8 w-8 text-white/70" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Album</div>
            <h1 className="mt-0.5 truncate text-lg font-bold text-white">{album.name}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-400">
              <Link href={`/artists/${album.artistId}`} className="text-white hover:underline">
                {album.artistName}
              </Link>
              {releaseYear && <span>• {releaseYear}</span>}
              <span>• {tracks.length} tracks</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        {tracks.map((track, i) => (
          <MiniTrackRow key={track.id} track={track} index={i} queue={tracks} />
        ))}
      </div>
    </div>
  );
}
