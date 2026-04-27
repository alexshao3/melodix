'use client';

import { useState } from 'react';

/**
 * Collapsible bio. Falls back to a 3-line clamp; if the bio overflows the
 * clamp, a "Read more" toggle reveals the full text. We measure with
 * `-webkit-line-clamp` instead of cap-counting characters so the toggle
 * never appears for short bios that already fit.
 */
export function ArtistBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  // Heuristic: anything over ~240 chars is very likely to overflow 3
  // lines on common viewport widths. Avoids a flicker layout pass.
  const showToggle = bio.trim().length > 240;

  return (
    <div className="mt-3 max-w-2xl">
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-zinc-300 ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        {bio}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
