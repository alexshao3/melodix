import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Disc3, User } from 'lucide-react';
import { formatNumber } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';
import { FollowButton } from '@/components/FollowButton';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniArtist({ params }: PageProps) {
  const { id } = await params;
  const data = await api.artist(id);
  if (!data) notFound();
  const { artist, tracks, albums } = data;
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
        <div className="mt-3">
          <FollowButton artistId={artist.id} />
        </div>
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

      {albums.length > 0 && (
        <div>
          <div className="mb-2 px-2 text-[11px] uppercase tracking-widest text-zinc-400">
            Discography
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {albums.map((album) => (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className="group flex flex-col gap-1.5 rounded-xl bg-white/[0.04] p-2 transition-colors active:bg-white/[0.08]"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gradient-to-br from-cyan-500/30 to-fuchsia-600/30">
                  {album.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Disc3 className="h-6 w-6 text-white/70" />
                    </div>
                  )}
                </div>
                <div className="truncate px-0.5 text-[11px] font-semibold text-white">
                  {album.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
