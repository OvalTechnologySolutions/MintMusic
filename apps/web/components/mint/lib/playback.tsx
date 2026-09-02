'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PlaybackEngine, type PlaybackState } from './audio';
import type { Song } from './types';

interface PlaybackContextValue {
  state: PlaybackState;
  progress: number;
  currentSongId: string | null;
  isPlaying: boolean;
  load: (song: Song) => Promise<void>;
  loadAndPlay: (song: Song) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  // Lazy-create a single engine (client only). useState initializer keeps it
  // stable across renders without touching a ref during render.
  const [engine] = useState<PlaybackEngine | null>(() =>
    typeof window !== 'undefined' ? new PlaybackEngine() : null,
  );

  const [state, setState] = useState<PlaybackState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!engine) return;
    const offState = engine.onState((s) => {
      setState(s);
      setCurrentSongId(engine.currentSong?.id ?? null);
    });
    const offProgress = engine.onProgress(setProgress);
    return () => {
      offState();
      offProgress();
      engine.dispose();
    };
  }, [engine]);

  const value = useMemo<PlaybackContextValue>(() => {
    return {
      state,
      progress,
      currentSongId,
      isPlaying: state === 'playing',
      load: async (song) => {
        setCurrentSongId(song.id);
        await engine?.load(song);
      },
      loadAndPlay: async (song) => {
        setCurrentSongId(song.id);
        await engine?.loadAndPlay(song);
      },
      play: async () => engine?.play(),
      pause: () => engine?.pause(),
      toggle: async () => engine?.toggle(),
    };
  }, [engine, state, progress, currentSongId]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}
