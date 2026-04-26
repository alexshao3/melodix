import { notFound } from 'next/navigation';
import { ListMusic } from 'lucide-react';
import { PlaylistAuthBoundary } from '@/components/playlist/PlaylistAuthBoundary';
import { PlayPlaylistButton } from './PlayPlaylistButton';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistPage({ params }: PageProps) {
  const { id } = await params;
  let data;
  try {
    data = await api.playlist(id);
  } catch {
    notFound();
  }
  const { playlist, tracks } = data;
  const totalSeconds = tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const minutes = Math.floor(totalSeconds / 60);

  return (
    <div>
      <header className="relative mt-2 flex flex-col items-start gap-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:flex-row sm:items-end sm:px-10">
        <div
          aria-hidden
          className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-40"
        />
        <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 shadow-2xl shadow-black/40">
          {playlist.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={playlist.cover} alt={playlist.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ListMusic className="h-16 w-16 text-white/70" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            {playlist.isPublic ? 'Playlist' : 'Private playlist'}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">{playlist.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
            <span className="font-medium text-white">{playlist.ownerName ?? 'Melodix'}</span>
            <span>•</span>
            <span>{tracks.length} tracks</span>
            <span>•</span>
            <span>{minutes} min</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <PlayPlaylistButton tracks={tracks} />
            <PlaylistAuthBoundary slot="controls" playlist={playlist} tracks={tracks} />
          </div>
        </div>
      </header>

      <div className="mt-8">
        <PlaylistAuthBoundary slot="tracks" playlist={playlist} tracks={tracks} />
      </div>
    </div>
  );
}
