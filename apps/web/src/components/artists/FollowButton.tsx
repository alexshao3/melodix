'use client';

import { useEffect, useState } from 'react';
import { Heart, UserPlus } from 'lucide-react';
import { GradientButton } from '@melodix/ui';
import { api } from '@/lib/api';

export interface FollowButtonProps {
  artistId: string;
}

/**
 * Owner-side toggle for following an artist. Reads `melodix.token` to decide
 * whether to mount the button at all — guests see a `Sign in` CTA instead.
 * Optimistic update; rolls back on failure. See ADR-0016.
 */
export function FollowButton({ artistId }: FollowButtonProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = typeof window !== 'undefined' ? localStorage.getItem('melodix.token') : null;
    setAuthed(Boolean(t));
    if (!t) return;
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

  if (authed === false) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/[0.08]"
      >
        <Heart className="h-4 w-4" />
        Sign in to follow
      </a>
    );
  }

  if (authed === null || following === null) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50"
      >
        <UserPlus className="h-4 w-4" />
        Follow
      </button>
    );
  }

  const onClick = async () => {
    if (busy) return;
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

  if (following) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed="true"
        aria-label="Unfollow"
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/[0.12]"
      >
        <Heart className="h-4 w-4 fill-current text-rose-400" />
        Following
      </button>
    );
  }

  return (
    <GradientButton size="md" icon={<UserPlus className="h-4 w-4" />} onClick={onClick}>
      Follow
    </GradientButton>
  );
}
