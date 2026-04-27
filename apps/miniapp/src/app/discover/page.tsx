import Link from 'next/link';
import { GENRES } from '@melodix/shared';
import { api, type SourceFilter } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ genre?: string; source?: string }>;
}

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'jamendo', label: 'Jamendo' },
  { value: 'upload', label: 'Uploads' },
];
const VALID_SOURCES = SOURCE_OPTIONS.map((o) => o.value);
function parseSource(raw?: string): SourceFilter {
  return (VALID_SOURCES as readonly string[]).includes(raw ?? '') ? (raw as SourceFilter) : 'all';
}

export default async function MiniDiscover({ searchParams }: PageProps) {
  const { genre, source: sourceRaw } = await searchParams;
  const selected = genre && GENRES.some((g) => g.id === genre) ? genre : null;
  const source = parseSource(sourceRaw);
  const tracks = selected ? await api.byGenre(selected, source) : await api.trending(source);

  function hrefFor(next: { genre?: string | null; source?: SourceFilter }): string {
    const params = new URLSearchParams();
    const g = next.genre === null ? null : (next.genre ?? selected);
    const s = next.source ?? source;
    if (g) params.set('genre', g);
    if (s !== 'all') params.set('source', s);
    const qs = params.toString();
    return qs ? `/discover?${qs}` : '/discover';
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-white">Discover</h1>

      <div>
        <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Source</div>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((opt) => {
            const active = source === opt.value;
            return (
              <Link
                key={opt.value}
                href={hrefFor({ source: opt.value })}
                className={
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                  (active
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300')
                }
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g.id}
            href={hrefFor({ genre: g.id })}
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
