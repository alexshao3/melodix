import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const dynamic = 'force-dynamic';

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
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-600 to-cyan-500">
            {playlist.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={playlist.cover} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-400">Playlist</div>
            <h1 className="truncate font-display text-xl font-bold text-white">{playlist.name}</h1>
            <div className="text-xs text-zinc-400">{tracks.length} tracks</div>
          </div>
        </div>
        {playlist.description && (
          <p className="mt-3 text-xs text-zinc-300">{playlist.description}</p>
        )}
      </header>
      <div className="flex flex-col">
        {tracks.map((t, i) => (
          <MiniTrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </div>
  );
}
