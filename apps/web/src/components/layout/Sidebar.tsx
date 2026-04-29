'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Monomark, Wordmark } from '@melodix/ui';
import { cn } from '@/lib/cn';

// Type-led nav: labels only, no lucide icon column. The "Build" direction
// of the design audit explicitly drops generic decorative icons from the
// nav so the typography itself carries the brand voice.
const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/search', label: 'Search' },
  { href: '/library', label: 'Library' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-white/5 bg-black/30 px-5 py-7 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex items-center gap-2.5">
        <Monomark className="h-9 w-9" />
        <Wordmark className="text-2xl text-white" />
      </Link>

      <nav className="flex flex-col">
        {NAV.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center py-2.5 text-[15px] font-medium tracking-tight transition-colors',
                'pl-4',
                active ? 'text-white' : 'text-zinc-400 hover:text-white',
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full"
                  style={{ background: 'var(--accent-bg)' }}
                />
              ) : null}
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 px-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Library</div>
      <div className="flex flex-1 flex-col overflow-y-auto pr-1 scrollbar-thin">
        <Link
          href="/library"
          className="py-1.5 pl-1 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Liked songs
        </Link>
        <Link
          href="/playlists/feat_chill_vibes"
          className="py-1.5 pl-1 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Chill Vibes
        </Link>
        <Link
          href="/playlists/feat_workout_pulse"
          className="py-1.5 pl-1 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Workout Pulse
        </Link>
        <Link
          href="/playlists/feat_focus_flow"
          className="py-1.5 pl-1 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          Focus Flow
        </Link>
      </div>

      <div
        className="rounded-xl border border-white/10 p-4"
        style={{ background: 'var(--surface-1)' }}
      >
        <div className="font-display text-base font-semibold tracking-tight text-white">
          Open in <span style={{ color: 'var(--accent-bg)' }}>Telegram</span>
        </div>
        <div className="mt-1 text-xs leading-snug text-zinc-400">
          Same library, native chat surface. Tap the bot to launch the Mini App.
        </div>
      </div>
    </aside>
  );
}
