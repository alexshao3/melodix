import type { Track } from '@melodix/shared';

/**
 * Mini App's per-device "recently played" history. Mirrors the web helper
 * (`apps/web/src/lib/recently-played.ts`) so the two surfaces stay in sync
 * mentally — see ADR-0010 for the rationale on keeping this client-side.
 */
const STORAGE_KEY = 'melodix.recentlyPlayed';
const MAX_ENTRIES = 30;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getRecentlyPlayed(): Track[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Track[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRecentlyPlayed(track: Track): void {
  if (!isBrowser()) return;
  try {
    const existing = getRecentlyPlayed().filter((t) => t.id !== track.id);
    const next = [track, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('melodix:recently-played-changed'));
  } catch {
    // ignore quota / disabled storage
  }
}
