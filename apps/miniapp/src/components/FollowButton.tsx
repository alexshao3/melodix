'use client';

import { useEffect, useState } from 'react';
import { Heart, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

export interface FollowButtonProps {
  artistId: string;
}

/**
 * Compact Mini App follow toggle. Optimistic; no-op for guests
 * (Telegram users are auto-authed once they enter the Mini App, so the
 * "no token" branch is rare but we still guard it). See ADR-0016.
 */
export function FollowButton({ artistId }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .followIds()
      .then((ids) => {
        if (!cancelled) setFollowing(ids.includes(artistId));
      })
      .catch(() => {
        if (!cancelled) setFollowing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  const onClick = async () => {
    if (busy || following === null) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await api.follow(artistId);
      else await api.unfollow(artistId);
    } catch {
      setFollowing(!next); // rollback
    } finally {
      setBusy(false);
    }
  };

  if (following === null) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/50"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Follow
      </button>
    );
  }

  if (following) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed="true"
        aria-label="Unfollow"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white"
      >
        <Heart className="h-3.5 w-3.5 fill-current text-rose-400" />
        Following
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-3 py-1.5 text-[11px] font-medium text-white"
    >
      <UserPlus className="h-3.5 w-3.5" />
      Follow
    </button>
  );
}
