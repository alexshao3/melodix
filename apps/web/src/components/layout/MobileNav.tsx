'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

// Type-only mobile nav. A 2 px coral underline marks the active route.
// Drops the four lucide icons (Home / Compass / Search / Library) that
// the audit flagged as generic decoration.
const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/discover', label: 'Discover' },
  { href: '/search', label: 'Search' },
  { href: '/library', label: 'Library' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-black/70 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center justify-center py-3 text-[13px] font-medium tracking-tight transition-colors',
                active ? 'text-white' : 'text-zinc-400 hover:text-white',
              )}
            >
              {label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-6 bottom-1.5 h-[2px] rounded-full"
                  style={{ background: 'var(--accent-bg)' }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
