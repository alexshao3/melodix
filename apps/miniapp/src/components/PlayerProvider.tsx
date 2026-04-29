'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Track } from '@melodix/shared';
import { tgHaptic } from '@/lib/telegram';
import { pushRecentlyPlayed } from '@/lib/recently-played';
import { api } from '@/lib/api';

/**
 * Player state is split across three contexts so subscribers only re-render
 * for the slice they consume. See the web app's PlayerProvider for the
 * rationale; this is the same pattern, scaled down to the Mini App's
 * smaller control surface.
 */
interface PlayerStateValue {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
}

interface PlayerProgressValue {
  position: number;
  duration: number;
}

interface PlayerControlsValue {
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
}

const PlayerStateContext = createContext<PlayerStateValue | null>(null);
const PlayerProgressContext = createContext<PlayerProgressValue | null>(null);
const PlayerControlsContext = createContext<PlayerControlsValue | null>(null);

export function usePlayerState(): PlayerStateValue {
  const ctx = useContext(PlayerStateContext);
  if (!ctx) throw new Error('usePlayerState must be used inside PlayerProvider');
  return ctx;
}

export function usePlayerProgress(): PlayerProgressValue {
  const ctx = useContext(PlayerProgressContext);
  if (!ctx) throw new Error('usePlayerProgress must be used inside PlayerProvider');
  return ctx;
}

export function usePlayerControls(): PlayerControlsValue {
  const ctx = useContext(PlayerControlsContext);
  if (!ctx) throw new Error('usePlayerControls must be used inside PlayerProvider');
  return ctx;
}

export function usePlayer(): PlayerStateValue & PlayerProgressValue & PlayerControlsValue {
  return { ...usePlayerState(), ...usePlayerProgress(), ...usePlayerControls() };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const handleEndedRef = useRef<() => void>(() => {});

  useEffect(() => {
    const a = new Audio();
    a.preload = 'metadata';
    audioRef.current = a;
    const t = () => setPosition(a.currentTime);
    const l = () => setDuration(a.duration || 0);
    const p = () => setIsPlaying(true);
    const ps = () => setIsPlaying(false);
    const e = () => handleEndedRef.current?.();
    a.addEventListener('timeupdate', t);
    a.addEventListener('loadedmetadata', l);
    a.addEventListener('play', p);
    a.addEventListener('pause', ps);
    a.addEventListener('ended', e);
    return () => {
      a.pause();
      a.removeEventListener('timeupdate', t);
      a.removeEventListener('loadedmetadata', l);
      a.removeEventListener('play', p);
      a.removeEventListener('pause', ps);
      a.removeEventListener('ended', e);
    };
  }, []);

  const playTrack = useCallback((t: Track) => {
    const a = audioRef.current;
    if (!a) return;
    a.src = t.streamUrl ?? t.audioUrl;
    setCurrentTrack(t);
    setPosition(0);
    pushRecentlyPlayed(t);
    // Best-effort server-side history mirror; `recordPlay` no-ops for guests.
    void api.recordPlay(t.id);
    a.play().catch(() => undefined);
  }, []);

  const play = useCallback(
    (track: Track, newQueue?: Track[]) => {
      tgHaptic('light');
      if (newQueue) {
        const idx = newQueue.findIndex((t) => t.id === track.id);
        const upcoming =
          idx >= 0 ? newQueue.slice(idx + 1) : newQueue.filter((t) => t.id !== track.id);
        setQueue(upcoming);
      }
      if (currentTrack && currentTrack.id !== track.id) {
        setHistory((h) => [...h.slice(-19), currentTrack]);
      }
      playTrack(track);
    },
    [currentTrack, playTrack],
  );

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    tgHaptic('light');
    if (a.paused) a.play();
    else a.pause();
  }, [currentTrack]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const [head, ...rest] = queue;
    if (!head) return;
    if (currentTrack) setHistory((h) => [...h.slice(-19), currentTrack]);
    setQueue(rest);
    playTrack(head);
  }, [queue, currentTrack, playTrack]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const last = history[history.length - 1];
    if (!last) {
      if (a) a.currentTime = 0;
      return;
    }
    setHistory((h) => h.slice(0, -1));
    if (currentTrack) setQueue((q) => [currentTrack, ...q]);
    playTrack(last);
  }, [history, currentTrack, playTrack]);

  useEffect(() => {
    handleEndedRef.current = () => next();
  }, [next]);

  const seek = useCallback((s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = s;
    setPosition(s);
  }, []);

  const stateValue = useMemo<PlayerStateValue>(
    () => ({ currentTrack, queue, isPlaying }),
    [currentTrack, queue, isPlaying],
  );
  const progressValue = useMemo<PlayerProgressValue>(
    () => ({ position, duration }),
    [position, duration],
  );
  const controlsValue = useMemo<PlayerControlsValue>(
    () => ({ play, toggle, next, prev, seek }),
    [play, toggle, next, prev, seek],
  );

  return (
    <PlayerStateContext.Provider value={stateValue}>
      <PlayerProgressContext.Provider value={progressValue}>
        <PlayerControlsContext.Provider value={controlsValue}>
          {children}
        </PlayerControlsContext.Provider>
      </PlayerProgressContext.Provider>
    </PlayerStateContext.Provider>
  );
}
