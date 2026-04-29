'use client';

import { Play } from 'lucide-react';
import { GradientButton } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { usePlayerControls } from '@/components/player/PlayerProvider';

export function PlayPlaylistButton({ tracks }: { tracks: Track[] }) {
  const { play } = usePlayerControls();
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
      Play
    </GradientButton>
  );
}
