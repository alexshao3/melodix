import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { GENRES } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

export const dynamic = 'force-dynamic';

export default async function MiniHome() {
  const [trending, featured] = await Promise.all([api.trending(), api.featured()]);

  return (
    <div className="flex flex-col gap-6">
      <header className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] px-5 py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(400px 200px at 80% 0%, rgba(217,70,239,0.4), transparent 60%), radial-gradient(400px 200px at 0% 100%, rgba(34,211,238,0.4), transparent 60%)',
          }}
        />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-zinc-300">
          <Sparkles className="h-3 w-3 text-cyan-300" />
          Inside Telegram
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-white">
          Where every beat <span className="text-gradient">finds you.</span>
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
              <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-fuchsia-600 to-cyan-500">
                {p.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover} alt="" className="h-full w-full object-cover" />
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
              className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white shadow ${g.color}`}
            >
              {g.label}
            </Link>
          ))}
        </div>
      </section>

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
