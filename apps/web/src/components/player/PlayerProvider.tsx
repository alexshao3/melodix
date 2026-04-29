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
import { pushRecentlyPlayed } from '@/lib/recently-played';
import { api } from '@/lib/api';

export type RepeatMode = 'off' | 'one' | 'all';

/**
 * The player exposes three contexts so subscribers only re-render on the
 * data they care about:
 *  - state    : currentTrack, queue, history, isPlaying, volume, shuffle, repeat
 *               (changes on user actions — track lists / sidebars subscribe here)
 *  - progress : position, duration (fires ~4 Hz from `timeupdate` — only the
 *               player bar / lyrics drawer subscribe here)
 *  - controls : play, toggle, next, prev, … callbacks with stable identity
 *               (any component that just needs to dispatch reads this and
 *               never re-renders for state changes at all)
 *
 * `usePlayer()` returns the merged shape for backward compatibility — it
 * subscribes to all three, so prefer the narrow hooks for new code.
 */
interface PlayerStateValue {
  currentTrack: Track | null;
  queue: Track[];
  history: Track[];
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
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
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  enqueue: (track: Track) => void;
  clearQueue: () => void;
}

const PlayerStateContext = createContext<PlayerStateValue | null>(null);
const PlayerProgressContext = createContext<PlayerProgressValue | null>(null);
const PlayerControlsContext = createContext<PlayerControlsValue | null>(null);

export function usePlayerState(): PlayerStateValue {
  const ctx = useContext(PlayerStateContext);
  if (!ctx) throw new Error('usePlayerState must be used within PlayerProvider');
  return ctx;
}

export function usePlayerProgress(): PlayerProgressValue {
  const ctx = useContext(PlayerProgressContext);
  if (!ctx) throw new Error('usePlayerProgress must be used within PlayerProvider');
  return ctx;
}

export function usePlayerControls(): PlayerControlsValue {
  const ctx = useContext(PlayerControlsContext);
  if (!ctx) throw new Error('usePlayerControls must be used within PlayerProvider');
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
  const [volume, setVolumeState] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const handleEndedRef = useRef<() => void>(() => {});

  // Initialize audio element on mount (browser-only).
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTime = () => setPosition(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => handleEndedRef.current?.();

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    const savedVol = parseFloat(localStorage.getItem('melodix.volume') ?? '');
    if (!Number.isNaN(savedVol)) {
      audio.volume = savedVol;
      setVolumeState(savedVol);
    } else {
      audio.volume = 0.85;
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const playTrack = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.streamUrl ?? track.audioUrl;
    setCurrentTrack(track);
    setPosition(0);
    pushRecentlyPlayed(track);
    // Mirror the play to the server-side history when authenticated. The
    // call is fire-and-forget — `api.recordPlay` is wrapped in `safe(...)`
    // so a 401 (guest) or network blip never reaches playback.
    if (typeof window !== 'undefined' && localStorage.getItem('melodix.token')) {
      void api.recordPlay(track.id);
    }
    audio.play().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[melodix] play failed', err);
    });
  }, []);

  const play = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (newQueue) {
        const idx = newQueue.findIndex((t) => t.id === track.id);
        const upcoming =
          idx >= 0 ? newQueue.slice(idx + 1) : newQueue.filter((t) => t.id !== track.id);
        setQueue(upcoming);
      }
      if (currentTrack && currentTrack.id !== track.id) {
        setHistory((h) => [...h.slice(-49), currentTrack]);
      }
      playTrack(track);
    },
    [currentTrack, playTrack],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, [currentTrack]);

  const next = useCallback(() => {
    if (queue.length === 0) {
      if (repeat === 'all' && history.length > 0 && currentTrack) {
        const all = [...history, currentTrack];
        const first = all[0];
        if (first) {
          setHistory([]);
          setQueue(all.slice(1));
          playTrack(first);
        }
      }
      return;
    }
    const idx = shuffle ? Math.floor(Math.random() * queue.length) : 0;
    const nextTrack = queue[idx];
    if (!nextTrack) return;
    const remaining = queue.filter((_, i) => i !== idx);
    if (currentTrack) setHistory((h) => [...h.slice(-49), currentTrack]);
    setQueue(remaining);
    playTrack(nextTrack);
  }, [queue, shuffle, currentTrack, history, repeat, playTrack]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const last = history[history.length - 1];
    if (!last) {
      if (audio) audio.currentTime = 0;
      return;
    }
    setHistory((h) => h.slice(0, -1));
    if (currentTrack) setQueue((q) => [currentTrack, ...q]);
    playTrack(last);
  }, [history, currentTrack, playTrack]);

  // Keep latest "next" logic available to ended handler.
  useEffect(() => {
    handleEndedRef.current = () => {
      const audio = audioRef.current;
      if (repeat === 'one' && audio && currentTrack) {
        audio.currentTime = 0;
        audio.play();
        return;
      }
      next();
    };
  }, [next, repeat, currentTrack]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = clamped;
    setVolumeState(clamped);
    localStorage.setItem('melodix.volume', String(clamped));
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
    [],
  );
  const enqueue = useCallback((track: Track) => setQueue((q) => [...q, track]), []);
  const clearQueue = useCallback(() => setQueue([]), []);

  // Media Session API.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: currentTrack.albumName ?? undefined,
      artwork: currentTrack.cover
        ? [
            { src: currentTrack.cover, sizes: '512x512', type: 'image/jpeg' },
            { src: currentTrack.cover, sizes: '256x256', type: 'image/jpeg' },
          ]
        : undefined,
    });
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
  }, [currentTrack, next, prev]);

  // Keyboard shortcuts. The handler is registered exactly once on mount; it
  // reads the latest control callbacks via a ref so we don't pay an
  // attach/detach cycle on every state-driven re-creation of `toggle/next/prev`.
  const controlsRef = useRef({ toggle, next, prev });
  controlsRef.current = { toggle, next, prev };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        controlsRef.current.toggle();
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        controlsRef.current.next();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        controlsRef.current.prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const stateValue = useMemo<PlayerStateValue>(
    () => ({ currentTrack, queue, history, isPlaying, volume, shuffle, repeat }),
    [currentTrack, queue, history, isPlaying, volume, shuffle, repeat],
  );

  const progressValue = useMemo<PlayerProgressValue>(
    () => ({ position, duration }),
    [position, duration],
  );

  const controlsValue = useMemo<PlayerControlsValue>(
    () => ({
      play,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      clearQueue,
    }),
    [play, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, enqueue, clearQueue],
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
