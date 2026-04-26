import { Section } from '@/components/sections/Section';
import { TrackGrid } from '@/components/sections/TrackGrid';
import { MoodPills } from '@/components/sections/MoodPills';
import { GENRES } from '@melodix/shared';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ genre?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const { genre } = await searchParams;
  const selectedGenre = genre && GENRES.some((g) => g.id === genre) ? genre : null;

  const [trending, byGenre] = await Promise.all([
    api.trending(24),
    selectedGenre ? api.byGenre(selectedGenre, 24) : Promise.resolve([]),
  ]);

  const genreLabel = selectedGenre ? GENRES.find((g) => g.id === selectedGenre)?.label : null;

  return (
    <div>
      <header className="relative mt-2 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:px-10">
        <div aria-hidden className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-50" />
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Discover</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-300">
          Browse by mood. Every pill is a vibe — tap one to dive in.
        </p>
        <div className="mt-6">
          <MoodPills />
        </div>
      </header>

      {selectedGenre ? (
        <Section title={`${genreLabel} tracks`} subtitle="Curated for the mood you picked.">
          <TrackGrid tracks={byGenre} />
        </Section>
      ) : (
        <Section title="Trending now" subtitle="What everyone is playing today.">
          <TrackGrid tracks={trending} />
        </Section>
      )}
    </div>
  );
}
