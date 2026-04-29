import Image from 'next/image';
import { notFound } from 'next/navigation';
import { User } from 'lucide-react';
import { formatNumber } from '@melodix/shared';
import { TrackList } from '@/components/sections/TrackList';
import { PlayTracksButton } from '@/components/sections/PlayTracksButton';
import { Section } from '@/components/sections/Section';
import { FollowButton } from '@/components/artists/FollowButton';
import { AlbumGrid } from '@/components/artists/AlbumGrid';
import { ArtistBio } from '@/components/artists/ArtistBio';
import { api } from '@/lib/api';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: PageProps) {
  const { id } = await params;
  let data;
  try {
    data = await api.artist(id);
  } catch {
    notFound();
  }
  const { artist, tracks, albums } = data;
  const topTracks = tracks.slice(0, 10);

  return (
    <div>
      <header className="relative mt-2 flex flex-col items-start gap-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:flex-row sm:items-end sm:px-10">
        <div aria-hidden className="aurora absolute inset-0 -z-10 opacity-40" />
        <div
          className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full shadow-2xl shadow-black/40"
          style={{ background: 'var(--surface-2)' }}
        >
          {artist.image ? (
            <Image src={artist.image} alt="" fill sizes="176px" priority className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-16 w-16 text-white/70" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">Artist</div>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {artist.name}
          </h1>
          {typeof artist.followers === 'number' && artist.followers > 0 && (
            <div className="mt-2 text-sm text-zinc-300">
              {formatNumber(artist.followers)} followers
            </div>
          )}
          {artist.bio && <ArtistBio bio={artist.bio} />}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlayTracksButton tracks={tracks} label="Play top tracks" />
            <FollowButton artistId={artist.id} />
          </div>
        </div>
      </header>

      {topTracks.length > 0 ? (
        <Section title="Top tracks" subtitle="Most-played from this artist.">
          <TrackList tracks={topTracks} />
        </Section>
      ) : (
        <p className="mt-8 text-sm text-zinc-400">No tracks available for this artist.</p>
      )}

      {albums.length > 0 && (
        <Section title="Discography" subtitle="Albums and EPs.">
          <AlbumGrid albums={albums} />
        </Section>
      )}
    </div>
  );
}
