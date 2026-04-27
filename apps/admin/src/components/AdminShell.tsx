'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ListMusic,
  Upload,
  Layers,
  ToggleLeft,
  Sparkles,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from './AuthProvider';

const NAV: Array<{
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  description: string;
}> = [
  {
    href: '/',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    description: 'Overview & quick stats',
  },
  {
    href: '/tracks',
    label: 'Tracks',
    Icon: ListMusic,
    description: 'Manage uploaded tracks',
  },
  {
    href: '/tracks/upload',
    label: 'Upload',
    Icon: Upload,
    description: 'Add a new track',
  },
  {
    href: '/tracks/bulk',
    label: 'Bulk upload',
    Icon: Layers,
    description: 'Many files at once',
  },
  {
    href: '/sources',
    label: 'Sources',
    Icon: ToggleLeft,
    description: 'Toggle music sources',
  },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { admin, signOut } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-4 py-6 lg:px-8">
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-rose-500">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            Melodix
            <span className="ml-1 text-xs font-medium text-zinc-400">/ admin</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="adminNavIndicator"
                    aria-hidden
                    className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-cyan-400 to-fuchsia-500"
                  />
                )}
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Signed in</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white">{admin?.username}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <MobileNav pathname={pathname} />
        <div className="space-y-6 pb-16">{children}</div>
      </main>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string | null }) {
  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2 backdrop-blur-xl scrollbar-thin lg:hidden">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs',
              active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
