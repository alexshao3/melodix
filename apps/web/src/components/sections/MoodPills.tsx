'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { GENRES } from '@melodix/shared';
import { GenrePill } from '@melodix/ui';

export function MoodPills() {
  const router = useRouter();
  // Preserve every other search param (notably `?source=` from the
  // discover page filter) when switching genres. On the home page where
  // these params don't exist, this is a no-op.
  const params = useSearchParams();
  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((g, i) => (
        <GenrePill
          key={g.id}
          label={g.label}
          color={g.color}
          index={i}
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.set('genre', g.id);
            router.push(`/discover?${next.toString()}`);
          }}
        />
      ))}
    </div>
  );
}
