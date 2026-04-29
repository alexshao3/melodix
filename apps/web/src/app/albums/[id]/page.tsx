import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Disc3 } from 'lucide-react';
import { TrackList } from '@/components/sections/TrackList';
import { PlayTracksButton } from '@/components/sections/PlayTracksButton';
import { api } from '@/lib/api';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumPage({ params }: PageProps) {
  const { id } = await params;
  let data;
  try {
    data = await api.album(id);
  } catch {
    notFound();
  }
  const { album, tracks } = data;
  const totalSeconds = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const releaseYear = album.releaseDate ? album.releaseDate.slice(0, 4) : null;

  return (
    <div>
      <header className="relative mt-2 flex flex-col items-start gap-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:flex-row sm:items-end sm:px-10">
        <div aria-hidden className="aurora absolute inset-0 -z-10 opacity-40" />
        <div
          className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
          style={{ background: 'var(--surface-2)' }}
        >
          {album.cover ? (
            <Image src={album.cover} alt="" fill sizes="176px" priority className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Disc3 className="h-16 w-16 text-white/70" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">Album</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {album.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-300">
            <Link
              href={`/artists/${album.artistId}`}
              className="font-medium text-white hover:underline"
            >
              {album.artistName}
            </Link>
            {releaseYear && (
              <>
                <span>•</span>
                <span>{releaseYear}</span>
              </>
            )}
            <span>•</span>
            <span>{tracks.length} tracks</span>
            {minutes > 0 && (
              <>
                <span>•</span>
                <span>{minutes} min</span>
              </>
            )}
          </div>
          <div className="mt-6">
            <PlayTracksButton tracks={tracks} label="Play album" />
          </div>
        </div>
      </header>

      <div className="mt-8">
        {tracks.length > 0 ? (
          <TrackList tracks={tracks} />
        ) : (
          <p className="text-sm text-zinc-400">No tracks available for this album.</p>
        )}
      </div>
    </div>
  );
}
