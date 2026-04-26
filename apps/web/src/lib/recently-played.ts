import type { Track } from '@melodix/shared';

/**
 * Lightweight, per-device "recently played" history. We deliberately keep this
 * client-side for now — server-side tracking is on the H2 roadmap. Storing the
 * full Track payload (capped to ~50 entries) means the Library page renders
 * instantly without a follow-up fetch.
 */
const STORAGE_KEY = 'melodix.recentlyPlayed';
const MAX_ENTRIES = 50;

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
    // localStorage might be quota-exceeded or disabled; ignore.
  }
}

export function clearRecentlyPlayed(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('melodix:recently-played-changed'));
  } catch {
    // ignore
  }
}
