'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackTokenResponse } from '@mintmusic/shared';

export interface RecordCarouselItem {
  releaseId: string;
  title: string;
  type: string;
  coverUrl?: string;
  creatorName: string;
  purchasedAt: string;
  tracks?: Array<{ id: string; title: string; trackNumber: number }>;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'unavailable';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function devicePlaybackPreference(): 'fairplay' | 'widevine' {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'fairplay' : 'widevine';
}

export default function RecordCarousel({ items }: { items: RecordCarouselItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [message, setMessage] = useState('Swipe to browse. Tap the selected record to play.');
  const scrollerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedReleaseRef = useRef<string | null>(null);
  const playStartedAtRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem = items[activeIndex];

  const reportListen = useCallback((releaseId: string) => {
    const startedAt = playStartedAtRef.current;
    playStartedAtRef.current = null;
    if (!startedAt) return;
    const listenedMs = Date.now() - startedAt;
    if (listenedMs < 5_000) return;
    void fetch('/api/collection/plays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        releaseId,
        source: 'collection',
        listenedMs,
        deviceType: /Mobi|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      }),
    });
  }, []);

  const stopCurrent = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (loadedReleaseRef.current) reportListen(loadedReleaseRef.current);
    loadedReleaseRef.current = null;
    setPlayerState('idle');
  }, [reportListen]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      audio?.pause();
      if (loadedReleaseRef.current) reportListen(loadedReleaseRef.current);
    };
  }, [reportListen]);

  const selectRecord = useCallback((index: number) => {
    if (index === activeIndex) return;
    stopCurrent();
    setActiveIndex(index);
    setMessage(`${items[index].title} selected. Tap to play.`);
  }, [activeIndex, items, stopCurrent]);

  const scrollToRecord = (index: number) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index));
    const scroller = scrollerRef.current;
    const target = scroller?.children.item(nextIndex) as HTMLElement | null;
    target?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
    selectRecord(nextIndex);
  };

  const handleScrollEnd = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    Array.from(scroller.children).forEach((child, index) => {
      const element = child as HTMLElement;
      const childCenter = element.offsetLeft + element.offsetWidth / 2;
      const distance = Math.abs(center - childCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    selectRecord(closestIndex);
  };

  const handleScroll = () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(handleScrollEnd, 90);
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !activeItem) return;

    if (loadedReleaseRef.current === activeItem.releaseId && audio.src) {
      if (audio.paused) {
        try {
          await audio.play();
        } catch {
          setMessage('Playback is ready. Use the audio control below to start.');
        }
      } else {
        audio.pause();
      }
      return;
    }

    stopCurrent();
    setPlayerState('loading');
    setMessage(`Preparing ${activeItem.title}…`);

    try {
      const response = await fetch('/api/collection/playback-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId: activeItem.releaseId,
          trackId: activeItem.tracks?.[0]?.id,
          drmSystem: devicePlaybackPreference(),
          deviceHint: navigator.userAgent,
        }),
      });
      const data = (await response.json()) as PlaybackTokenResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'This record is not ready to play.');
      if (data.drm) {
        throw new Error('Protected playback is not available in this browser yet.');
      }

      audio.src = data.streamUrl;
      audio.load();
      loadedReleaseRef.current = activeItem.releaseId;
      setPlayerState('paused');
      setMessage(`${activeItem.title} is ready.`);
      try {
        await audio.play();
      } catch {
        setMessage('Ready to play. Tap the play control below.');
      }
    } catch (error) {
      setPlayerState('unavailable');
      setMessage(error instanceof Error ? error.message : 'This record is not ready to play.');
    }
  };

  return (
    <div className="record-player">
      <div className="record-player__toolbar">
        <div>
          <p className="mm-eyebrow text-[var(--mm-mint-soft)]">YOUR RECORD SHELF</p>
          <p className="mt-2 text-sm text-gray-400">Swipe left or right to choose a record.</p>
        </div>
        <div className="record-player__arrows" aria-label="Record navigation">
          <button
            type="button"
            onClick={() => scrollToRecord(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Previous record"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollToRecord(activeIndex + 1)}
            disabled={activeIndex === items.length - 1}
            aria-label="Next record"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="record-carousel scrollbar-hide"
        onScroll={handleScroll}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') scrollToRecord(activeIndex - 1);
          if (event.key === 'ArrowRight') scrollToRecord(activeIndex + 1);
        }}
        role="group"
        aria-label="Owned records"
        tabIndex={0}
      >
        {items.map((item, index) => {
          const selected = index === activeIndex;
          const spinning = selected && playerState === 'playing';
          return (
            <article
              key={item.releaseId}
              className={`record-carousel__slide ${selected ? 'record-carousel__slide--active' : ''}`}
              aria-label={`${item.title} by ${item.creatorName}${selected ? ', selected' : ''}`}
            >
              <button
                type="button"
                className="record-swipe-card"
                onClick={() => selected ? void togglePlayback() : scrollToRecord(index)}
                aria-label={selected ? `${playerState === 'playing' ? 'Pause' : 'Play'} ${item.title}` : `Select ${item.title}`}
              >
                <span className={`record-swipe-card__disc ${spinning ? 'record-swipe-card__disc--playing' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/disc-core.png" alt="" draggable={false} />
                </span>
                <span className="record-swipe-card__sleeve">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.coverUrl} alt="" draggable={false} />
                  ) : (
                    <span className="record-swipe-card__placeholder" aria-hidden="true">MM</span>
                  )}
                  <span className="record-swipe-card__play" aria-hidden="true">
                    {playerState === 'loading' && selected ? '…' : spinning ? 'Ⅱ' : '▶'}
                  </span>
                </span>
              </button>
              <div className="record-carousel__meta">
                <p className="truncate font-semibold">{item.title}</p>
                <p className="truncate text-sm text-gray-400">{item.creatorName} · {item.type}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {item.tracks?.length ?? 0} track{item.tracks?.length === 1 ? '' : 's'} · Collected{' '}
                  {new Date(item.purchasedAt).toLocaleDateString()}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="record-player__status">
        <div className="record-player__dots" aria-hidden="true">
          {items.map((item, index) => (
            <span key={item.releaseId} className={index === activeIndex ? 'is-active' : ''} />
          ))}
        </div>
        <p role="status" aria-live="polite">{message}</p>
      </div>

      <audio
        ref={audioRef}
        className="record-player__audio"
        controls
        controlsList="nodownload"
        preload="none"
        onPlay={() => {
          playStartedAtRef.current = Date.now();
          setPlayerState('playing');
          setMessage(`Playing ${activeItem.title}.`);
        }}
        onPause={() => {
          if (loadedReleaseRef.current) reportListen(loadedReleaseRef.current);
          setPlayerState((state) => state === 'unavailable' ? state : 'paused');
        }}
        onEnded={() => {
          if (loadedReleaseRef.current) reportListen(loadedReleaseRef.current);
          setPlayerState('paused');
          setMessage(`${activeItem.title} finished.`);
        }}
      />
    </div>
  );
}
