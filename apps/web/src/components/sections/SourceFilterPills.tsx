'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import type { SourceFilter } from '@/lib/api';

const OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'jamendo', label: 'Jamendo' },
  { value: 'upload', label: 'Uploads' },
];

/**
 * 3-pill source selector for `/discover`. Reflects the current
 * `?source=` query param and produces hrefs that preserve every other
 * search param (notably `?genre=`). Server-rendered page reruns on
 * navigation, so this is a server-driven filter — zero client fetching.
 */
export function SourceFilterPills() {
  const params = useSearchParams();
  const pathname = usePathname();
  const current = (params.get('source') as SourceFilter) ?? 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-widest text-zinc-500">Source</span>
      {OPTIONS.map((opt) => {
        const next = new URLSearchParams(params.toString());
        if (opt.value === 'all') next.delete('source');
        else next.set('source', opt.value);
        const qs = next.toString();
        const active = current === opt.value || (opt.value === 'all' && !params.get('source'));
        return (
          <Link
            key={opt.value}
            href={qs ? `${pathname}?${qs}` : pathname}
            scroll={false}
            className={
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
              (active
                ? 'border-white/40 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white')
            }
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
