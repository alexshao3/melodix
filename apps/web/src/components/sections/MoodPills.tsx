'use client';

import { useRouter } from 'next/navigation';
import { GENRES } from '@melodix/shared';
import { GenrePill } from '@melodix/ui';

export function MoodPills() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((g, i) => (
        <GenrePill
          key={g.id}
          label={g.label}
          color={g.color}
          index={i}
          onClick={() => router.push(`/discover?genre=${g.id}`)}
        />
      ))}
    </div>
  );
}
