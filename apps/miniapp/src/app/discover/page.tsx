import Link from 'next/link';
import { GENRES } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ genre?: string }>;
}

export default async function MiniDiscover({ searchParams }: PageProps) {
  const { genre } = await searchParams;
  const selected = genre && GENRES.some((g) => g.id === genre) ? genre : null;
  const tracks = selected ? await api.byGenre(selected) : await api.trending();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-white">Discover</h1>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g.id}
            href={`/discover?genre=${g.id}`}
            className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white shadow ${
              selected === g.id ? 'ring-2 ring-white/70' : ''
            } ${g.color}`}
          >
            {g.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-col">
        {tracks.map((t, i) => (
          <MiniTrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </div>
  );
}
