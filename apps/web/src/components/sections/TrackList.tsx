'use client';

import type { Track } from '@melodix/shared';
import { TrackCard } from '@melodix/ui';
import { usePlayerControls, usePlayerState } from '@/components/player/PlayerProvider';

export function TrackList({ tracks }: { tracks: Track[] }) {
  const { play } = usePlayerControls();
  const { currentTrack, isPlaying } = usePlayerState();
  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track, i) => (
        <TrackCard
          key={track.id}
          track={track}
          index={i}
          variant="row"
          isActive={currentTrack?.id === track.id}
          isPlaying={currentTrack?.id === track.id && isPlaying}
          onPlay={(t) => play(t, tracks)}
        />
      ))}
    </div>
  );
}
