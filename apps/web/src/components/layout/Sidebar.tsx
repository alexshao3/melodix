'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Library, ListMusic, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-white/5 bg-black/30 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-rose-500 shadow-lg shadow-fuchsia-500/30">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight text-white">Melodix</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-white/10 text-white shadow-inner shadow-white/5'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-cyan-300')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 flex items-center justify-between px-3 text-xs uppercase tracking-widest text-zinc-500">
        <span>Your library</span>
        <ListMusic className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin">
        <Link
          href="/library"
          className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          Liked songs
        </Link>
        <Link
          href="/playlists/feat_chill_vibes"
          className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          Chill Vibes
        </Link>
        <Link
          href="/playlists/feat_workout_pulse"
          className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          Workout Pulse
        </Link>
        <Link
          href="/playlists/feat_focus_flow"
          className="rounded-xl px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          Focus Flow
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-600/30 to-cyan-500/20 p-4">
        <div className="font-display text-sm font-semibold text-white">Open in Telegram</div>
        <div className="mt-1 text-xs text-zinc-300">
          Try the Melodix Mini App for the same library inside any Telegram chat.
        </div>
      </div>
    </aside>
  );
}
