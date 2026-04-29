'use client';

import type { Track } from '@melodix/shared';
import { TrackCard } from '@melodix/ui';
import { usePlayerControls, usePlayerState } from '@/components/player/PlayerProvider';

export function TrackGrid({ tracks }: { tracks: Track[] }) {
  const { play } = usePlayerControls();
  const { currentTrack, isPlaying } = usePlayerState();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {tracks.map((track, i) => (
        <TrackCard
          key={track.id}
          track={track}
          index={i}
          isActive={currentTrack?.id === track.id}
          isPlaying={currentTrack?.id === track.id && isPlaying}
          onPlay={(t) => play(t, tracks)}
        />
      ))}
    </div>
  );
}
