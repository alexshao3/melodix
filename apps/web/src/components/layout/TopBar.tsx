'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, User } from 'lucide-react';
import { Monomark, Wordmark } from '@melodix/ui';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function TopBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-all ${
        scrolled ? 'border-b border-white/5 bg-black/40 backdrop-blur-xl' : ''
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        {/* Mobile brand */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Monomark className="h-8 w-8" />
          <Wordmark className="text-xl text-white" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-zinc-300 hover:text-white"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => router.forward()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-zinc-300 hover:text-white"
            aria-label="Forward"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <form
          className="flex flex-1 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="relative flex w-full max-w-md items-center">
            <Search className="absolute left-4 h-4 w-4 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Songs, artists, albums…"
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[color:var(--accent-line)] focus:bg-white/10 focus:outline-none"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 sm:flex"
          >
            <User className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
