import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { MiniTracksAuthBoundary } from '@/components/MiniTracksAuthBoundary';
import { PlaylistOwnerGate } from '@/components/PlaylistOwnerGate';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MiniPlaylist({ params }: PageProps) {
  const { id } = await params;
  const data = await api.playlist(id);
  if (!data) notFound();
  const { playlist, tracks } = data;
  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[color:var(--surface-2)]">
            {playlist.cover ? (
              <Image
                src={playlist.cover}
                alt=""
                fill
                sizes="80px"
                priority
                className="object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">
              {playlist.isPublic ? 'Playlist' : 'Private playlist'}
            </div>
            <h1 className="truncate font-display text-xl font-bold text-white">{playlist.name}</h1>
            <div className="text-xs text-zinc-400">{tracks.length} tracks</div>
          </div>
        </div>
        {playlist.description && (
          <p className="mt-3 text-xs text-zinc-300">{playlist.description}</p>
        )}
        <div className="mt-3">
          <PlaylistOwnerGate playlist={playlist} />
        </div>
      </header>
      <MiniTracksAuthBoundary playlist={playlist} tracks={tracks} />
    </div>
  );
}
