'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '../lib/analytics';
import { usePlayback } from '../lib/playback';
import { useMint } from '../lib/store';
import type { Song } from '../lib/types';
import { useMintReducedMotion } from '../lib/useReducedMotion';
import { Turntable } from '../player/Turntable';
import { GestureCoach } from './GestureCoach';
import { SongInfoSheet } from './SongInfoSheet';
import { SwipeableRecord, type SwipeHandle } from './SwipeableRecord';

export function DiscoveryExperience({ onOpenArtist }: { onOpenArtist: (slug: string) => void }) {
  const { catalog, listener, isCollected, collect, uncollect, recordEvent, tutorialSeen, markTutorialSeen, hydrated } =
    useMint();
  const playback = usePlayback();
  const reducedMotion = useMintReducedMotion();

  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const swipeRef = useRef<SwipeHandle>(null);
  const autoPlayRef = useRef(false);
  const builtRef = useRef(false);

  // Build the discovery queue once: unseen + genre-relevant first, then random.
  useEffect(() => {
    if (!hydrated || builtRef.current) return;
    const uncollected = catalog.filter((s) => !isCollected(s.id));
    const fav = listener.favoriteGenres;
    const ordered = uncollected
      .map((s) => ({
        s,
        score: fav.length ? (s.genres.some((g) => fav.includes(g)) ? 1 : 0) : 0,
        r: Math.random(),
      }))
      .sort((a, b) => b.score - a.score || a.r - b.r)
      .map((x) => x.s);
    setQueue(ordered);
    builtRef.current = true;
  }, [hydrated, catalog, isCollected, listener.favoriteGenres]);

  // Append newly published uploads so artist releases enter Discover.
  useEffect(() => {
    if (!builtRef.current) return;
    setQueue((prev) => {
      const known = new Set(prev.map((s) => s.id));
      const additions = catalog.filter((s) => !known.has(s.id) && !isCollected(s.id));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [catalog, isCollected]);

  const currentSong = queue[index] ?? null;

  // Load each record as it lands; continue playing once the user has started.
  useEffect(() => {
    if (!currentSong) return;
    track('track_loaded', { songId: currentSong.id });
    recordEvent(currentSong.id, 'play');
    if (autoPlayRef.current) {
      void playback.loadAndPlay(currentSong).then(() => track('track_played', { songId: currentSong.id }));
    } else {
      void playback.load(currentSong);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const handleSkip = useCallback(() => {
    if (!currentSong) return;
    recordEvent(currentSong.id, 'skip');
    track('track_skipped', { songId: currentSong.id });
    if (!tutorialSeen) markTutorialSeen();
    advance();
  }, [currentSong, recordEvent, tutorialSeen, markTutorialSeen, advance]);

  const handleCollect = useCallback(() => {
    if (!currentSong) return;
    collect(currentSong);
    if (!tutorialSeen) markTutorialSeen();
    advance();
  }, [currentSong, collect, tutorialSeen, markTutorialSeen, advance]);

  const handleTap = useCallback(async () => {
    autoPlayRef.current = true;
    await playback.toggle();
    if (playback.state !== 'playing') track('track_played', { songId: currentSong?.id });
  }, [playback, currentSong?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (infoOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        swipeRef.current?.skip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        swipeRef.current?.collect();
      } else if (e.key === ' ') {
        e.preventDefault();
        void handleTap();
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (currentSong) setInfoOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [infoOpen, handleTap, currentSong]);

  const isPlayingCurrent = playback.isPlaying && playback.currentSongId === currentSong?.id;

  const emptyState = useMemo(
    () => (
      <div className="text-center">
        <p className="text-[17px] font-semibold text-white">Fresh records are being stocked.</p>
        <p className="mt-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Check back soon, or collect from your favorite artists.
        </p>
      </div>
    ),
    [],
  );

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-6">
      <Turntable active={isPlayingCurrent} reducedMotion={reducedMotion}>
        {(size) =>
          currentSong ? (
            <div className="relative" style={{ width: size, height: size }}>
              <GestureCoach visible={!tutorialSeen && index === 0} />
              <SwipeableRecord
                key={currentSong.id}
                ref={swipeRef}
                song={currentSong}
                size={size}
                spinning={isPlayingCurrent}
                reducedMotion={reducedMotion}
                onSkip={handleSkip}
                onCollect={handleCollect}
                onTap={handleTap}
              />
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              {emptyState}
            </div>
          )
        }
      </Turntable>

      {/* now playing + minimal controls */}
      {currentSong && (
        <div className="flex flex-col items-center gap-3 text-center mint-safe-x">
          <div>
            <p className="text-[18px] font-bold text-white">{currentSong.title}</p>
            <button
              onClick={() => onOpenArtist(currentSong.artistSlug)}
              className="mint-focus text-[14px]"
              style={{ color: 'var(--mint-primary)' }}
            >
              {currentSong.artist}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTap}
              aria-label={isPlayingCurrent ? 'Pause' : 'Play'}
              className="mint-focus flex h-11 w-11 items-center justify-center rounded-full text-[#0A0A0B]"
              style={{ background: 'var(--mint-primary)' }}
            >
              {isPlayingCurrent ? '❚❚' : '▶'}
            </button>
            <button
              onClick={() => setInfoOpen(true)}
              aria-label="Song information"
              className="mint-focus flex h-11 w-11 items-center justify-center rounded-full text-white/80"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              i
            </button>
          </div>
        </div>
      )}

      <SongInfoSheet
        song={currentSong}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        collected={currentSong ? isCollected(currentSong.id) : false}
        onToggleCollect={() => {
          if (!currentSong) return;
          if (isCollected(currentSong.id)) uncollect(currentSong.id);
          else collect(currentSong);
        }}
        onOpenArtist={() => {
          setInfoOpen(false);
          if (currentSong) onOpenArtist(currentSong.artistSlug);
        }}
      />
    </div>
  );
}
