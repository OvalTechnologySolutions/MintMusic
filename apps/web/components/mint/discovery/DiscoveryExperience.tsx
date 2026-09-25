'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveSong } from '../lib/billing-api';
import { track } from '../lib/analytics';
import { usePlayback } from '../lib/playback';
import { useMint } from '../lib/store';
import type { Song } from '../lib/types';
import { useMintReducedMotion } from '../lib/useReducedMotion';
import { Turntable } from '../player/Turntable';
import { GestureCoach } from './GestureCoach';
import { SongInfoSheet } from './SongInfoSheet';
import { SwipeableRecord, type SwipeHandle } from './SwipeableRecord';

async function collectSongToLibrary(song: Song): Promise<'ok' | 'need_mint' | 'error'> {
  if (!song.saveEligible || !song.trackId) {
    return 'ok';
  }
  try {
    const key = `save:${song.trackId}:${crypto.randomUUID()}`;
    await saveSong(song.trackId, key);
    return 'ok';
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 402) return 'need_mint';
    throw err;
  }
}

export function DiscoveryExperience({
  onOpenArtist,
  onNeedMint,
  resumeSaveSong,
  onResumeSaveHandled,
  onBalanceMaybeChanged,
}: {
  onOpenArtist: (slug: string) => void;
  onNeedMint?: (song: Song) => void;
  resumeSaveSong?: Song | null;
  onResumeSaveHandled?: () => void;
  onBalanceMaybeChanged?: () => void;
}) {
  const { catalog, listener, isCollected, collect, uncollect, recordEvent, tutorialSeen, markTutorialSeen, hydrated } =
    useMint();
  const playback = usePlayback();
  const reducedMotion = useMintReducedMotion();

  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [collectBusy, setCollectBusy] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectTip, setCollectTip] = useState<string | null>(null);
  const [firstPaidSaveSeen, setFirstPaidSaveSeen] = useState(true);
  const swipeRef = useRef<SwipeHandle>(null);
  const autoPlayRef = useRef(false);
  const builtRef = useRef(false);
  const collectingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setFirstPaidSaveSeen(localStorage.getItem('mint:firstSaveSeen') === '1');
  }, []);

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

  const finishCollect = useCallback(
    (song: Song) => {
      collect(song);
      recordEvent(song.id, 'collect');
      track('track_collected', { songId: song.id });
      if (!tutorialSeen) markTutorialSeen();
      onBalanceMaybeChanged?.();
      if (song.saveEligible && !firstPaidSaveSeen) {
        localStorage.setItem('mint:firstSaveSeen', '1');
        setFirstPaidSaveSeen(true);
        setCollectTip('Collected · 0.25 Mint — account playback and offline listening included.');
        window.setTimeout(() => setCollectTip(null), 4500);
      }
      advance();
    },
    [
      collect,
      recordEvent,
      tutorialSeen,
      markTutorialSeen,
      onBalanceMaybeChanged,
      firstPaidSaveSeen,
      advance,
    ],
  );

  /** Swipe-right / Collect: shelves the song (and paid-saves when eligible). */
  const performCollect = useCallback(
    async (song: Song) => {
      if (collectingRef.current) return;
      collectingRef.current = true;
      setCollectBusy(true);
      setCollectError(null);
      try {
        const result = await collectSongToLibrary(song);
        if (result === 'need_mint') {
          onNeedMint?.(song);
          return;
        }
        finishCollect(song);
      } catch (err) {
        setCollectError(err instanceof Error ? err.message : 'Could not collect');
      } finally {
        collectingRef.current = false;
        setCollectBusy(false);
      }
    },
    [finishCollect, onNeedMint],
  );

  // After Add Mint checkout, resume the interrupted swipe-collect.
  useEffect(() => {
    if (!resumeSaveSong) return;
    onResumeSaveHandled?.();
    void performCollect(resumeSaveSong);
  }, [resumeSaveSong, onResumeSaveHandled, performCollect]);

  const handleSkip = useCallback(() => {
    if (!currentSong || collectBusy) return;
    recordEvent(currentSong.id, 'skip');
    track('track_skipped', { songId: currentSong.id });
    if (!tutorialSeen) markTutorialSeen();
    advance();
  }, [currentSong, collectBusy, recordEvent, tutorialSeen, markTutorialSeen, advance]);

  const handleCollect = useCallback(() => {
    if (!currentSong || collectBusy) return;
    void performCollect(currentSong);
  }, [currentSong, collectBusy, performCollect]);

  const handleTap = useCallback(async () => {
    autoPlayRef.current = true;
    await playback.toggle();
    if (playback.state !== 'playing') track('track_played', { songId: currentSong?.id });
  }, [playback, currentSong?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (infoOpen || collectBusy) return;
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
  }, [infoOpen, collectBusy, handleTap, currentSong]);

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
          {currentSong.saveEligible && (
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Swipe right to collect · 0.25 Mint
            </p>
          )}
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

      {(collectTip || collectError || collectBusy) && (
        <p
          className="max-w-sm px-4 text-center text-[13px]"
          style={{ color: collectError ? '#F07178' : 'var(--mint-primary)' }}
          role="status"
        >
          {collectBusy ? 'Collecting…' : collectError ?? collectTip}
        </p>
      )}

      <SongInfoSheet
        song={currentSong}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        collected={currentSong ? isCollected(currentSong.id) : false}
        collectBusy={collectBusy}
        onToggleCollect={() => {
          if (!currentSong) return;
          if (isCollected(currentSong.id)) {
            uncollect(currentSong.id);
            return;
          }
          setInfoOpen(false);
          void performCollect(currentSong);
        }}
        onOpenArtist={() => {
          setInfoOpen(false);
          if (currentSong) onOpenArtist(currentSong.artistSlug);
        }}
        savePriceLabel={
          currentSong?.saveEligible ? '0.25 Mint' : undefined
        }
      />
    </div>
  );
}
