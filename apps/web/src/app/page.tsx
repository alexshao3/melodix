import { Hero } from '@/components/hero/Hero';
import { Section } from '@/components/sections/Section';
import { TrackGrid } from '@/components/sections/TrackGrid';
import { PlaylistGrid } from '@/components/sections/PlaylistGrid';
import { MoodPills } from '@/components/sections/MoodPills';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [trending, newReleases, featured] = await Promise.all([
    api.trending(12),
    api.newReleases(12),
    api.featuredPlaylists(),
  ]);

  return (
    <div>
      <Hero />

      <Section title="Pick a mood" subtitle="Browse by genre and let the playlists do the work.">
        <MoodPills />
      </Section>

      <Section title="Trending now" subtitle="What everyone is playing today." href="/discover">
        <TrackGrid tracks={trending} />
      </Section>

      <Section title="Featured playlists" subtitle="Hand-picked moods, curated by Melodix.">
        <PlaylistGrid playlists={featured} />
      </Section>

      <Section title="Fresh releases" subtitle="Newest tracks added to the catalog." href="/discover">
        <TrackGrid tracks={newReleases} />
      </Section>
    </div>
  );
}
