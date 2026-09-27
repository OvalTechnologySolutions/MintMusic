'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ensurePlaybackEngine, type PlaybackEngine, type PlaybackState } from './audio';
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
  const engineRef = useRef<PlaybackEngine | null>(null);
  const getEngine = () => {
    engineRef.current = ensurePlaybackEngine(engineRef.current);
    return engineRef.current;
  };

  const [state, setState] = useState<PlaybackState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);

  useEffect(() => {
    const engine = getEngine();
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
      engineRef.current = null;
    };
  }, []);

  const value = useMemo<PlaybackContextValue>(() => {
    return {
      state,
      progress,
      currentSongId,
      isPlaying: state === 'playing',
      load: async (song) => {
        setCurrentSongId(song.id);
        await getEngine()?.load(song);
      },
      loadAndPlay: async (song) => {
        setCurrentSongId(song.id);
        await getEngine()?.loadAndPlay(song);
      },
      play: async () => getEngine()?.play(),
      pause: () => getEngine()?.pause(),
      toggle: async () => getEngine()?.toggle(),
    };
  }, [state, progress, currentSongId]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}
