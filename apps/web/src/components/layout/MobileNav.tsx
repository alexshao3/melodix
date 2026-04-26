'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Library, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-black/70 backdrop-blur-xl lg:hidden">
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
