'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, Home, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Heart },
  { href: '/search', label: 'Search', icon: Search },
];

export function MiniNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-xl">
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs',
                active ? 'text-white' : 'text-zinc-500',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-cyan-300')} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
