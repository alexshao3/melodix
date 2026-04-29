import Image from 'next/image';
import Link from 'next/link';
import { GENRES } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';
import { MiniRecommendedSection } from '@/components/MiniRecommendedSection';

export const revalidate = 60;

export default async function MiniHome() {
  const [trending, featured] = await Promise.all([api.trending(), api.featured()]);

  return (
    <div className="flex flex-col gap-6">
      {/* Quiet near-black header — no double-radial gradient. The single
       * coral accent on "taste" carries the brand; everything else is
       * type-led to keep the Mini App feel native to Telegram chrome. */}
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-1)] px-5 py-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-300">
          Inside Telegram
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-white">
          Music with{' '}
          <span
            className="italic text-accent"
            style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1' }}
          >
            taste
          </span>
          <span className="text-white">.</span>
        </h1>
        <p className="mt-1 text-xs text-zinc-300">
          Tap a song to play. The mini-player stays with you everywhere.
        </p>
      </header>

      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="font-display text-base font-semibold text-white">Featured playlists</h2>
        </div>
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
          {featured.map((p) => (
            <Link
              key={p.id}
              href={`/playlists/${p.id}`}
              className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-white/[0.04]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--surface-2)]">
                {p.cover ? (
                  <Image
                    src={p.cover}
                    alt=""
                    fill
                    sizes="(min-width: 480px) 33vw, 50vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="px-2 py-2">
                <div className="truncate text-xs font-semibold text-white">{p.name}</div>
                <div className="truncate text-[10px] text-zinc-400">{p.trackCount} tracks</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 font-display text-base font-semibold text-white">Moods</div>
        <div className="flex flex-wrap gap-2">
          {GENRES.slice(0, 8).map((g) => (
            <Link
              key={g.id}
              href={`/discover?genre=${g.id}`}
              className="rounded-full border border-[color:var(--hairline)] bg-transparent px-3 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-[color:var(--hairline-strong)] hover:text-white"
            >
              {g.label}
            </Link>
          ))}
        </div>
      </section>

      <MiniRecommendedSection />

      <section>
        <div className="mb-2 flex items-end justify-between">
          <h2 className="font-display text-base font-semibold text-white">Trending now</h2>
          <Link href="/discover" className="text-[11px] text-zinc-400">
            See all
          </Link>
        </div>
        <div className="flex flex-col">
          {trending.slice(0, 12).map((t, i) => (
            <MiniTrackRow key={t.id} track={t} index={i} queue={trending} />
          ))}
        </div>
      </section>
    </div>
  );
}
