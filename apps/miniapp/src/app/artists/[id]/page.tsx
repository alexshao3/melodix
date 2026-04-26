import { notFound } from 'next/navigation';
import { User } from 'lucide-react';
import { formatNumber } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniArtist({ params }: PageProps) {
  const { id } = await params;
  const data = await api.artist(id);
  if (!data) notFound();
  const { artist, tracks } = data;
  const topTracks = tracks.slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500">
            {artist.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-8 w-8 text-white/70" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Artist</div>
            <h1 className="mt-0.5 truncate text-lg font-bold text-white">{artist.name}</h1>
            {typeof artist.followers === 'number' && artist.followers > 0 && (
              <div className="mt-0.5 truncate text-xs text-zinc-400">
                {formatNumber(artist.followers)} followers
              </div>
            )}
          </div>
        </div>
        {artist.bio && (
          <p className="mt-3 text-xs leading-relaxed text-zinc-300 line-clamp-3">{artist.bio}</p>
        )}
      </header>

      <div>
        <div className="mb-2 px-2 text-[11px] uppercase tracking-widest text-zinc-400">
          Top tracks
        </div>
        <div className="flex flex-col gap-1">
          {topTracks.map((track, i) => (
            <MiniTrackRow key={track.id} track={track} index={i} queue={tracks} />
          ))}
        </div>
      </div>
    </div>
  );
}
