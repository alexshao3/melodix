'use client';

import { Play } from 'lucide-react';
import { GradientButton } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { usePlayer } from '@/components/player/PlayerProvider';

export interface PlayTracksButtonProps {
  tracks: Track[];
  label?: string;
}

/**
 * Reusable "Play <thing>" button. Plays the first track and queues the rest.
 * Used by playlist / album / artist detail pages.
 */
export function PlayTracksButton({ tracks, label = 'Play' }: PlayTracksButtonProps) {
  const { play } = usePlayer();
  return (
    <GradientButton
      size="lg"
      icon={<Play className="h-4 w-4 fill-current" />}
      onClick={() => {
        const first = tracks[0];
        if (first) play(first, tracks);
      }}
      disabled={tracks.length === 0}
    >
      {label}
    </GradientButton>
  );
}
