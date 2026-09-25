'use client';

import { useState } from 'react';
import { track } from '../lib/analytics';
import { usePlayback } from '../lib/playback';
import { useMint } from '../lib/store';
import { useMintReducedMotion } from '../lib/useReducedMotion';
import { Turntable } from '../player/Turntable';
import { VinylRecord } from '../player/VinylRecord';
import { RecordSleeve } from './RecordSleeve';

export function CollectionExperience({
  onGoDiscover,
  userId,
}: {
  onGoDiscover: () => void;
  userId?: string;
}) {
  const { collectedSongs, uncollect } = useMint();
  const playback = usePlayback();
  const reducedMotion = useMintReducedMotion();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const selectedId = pickedId ?? collectedSongs[0]?.id ?? null;
  const selected = collectedSongs.find((s) => s.id === selectedId) ?? null;
  const isPlayingSelected = playback.isPlaying && playback.currentSongId === selected?.id;

  const playSong = async (id: string) => {
    const song = collectedSongs.find((s) => s.id === id);
    if (!song) return;
    setPickedId(id);
    await playback.loadAndPlay(song);
    track('collection_track_played', { songId: id });
  };

  const downloadOffline = async () => {
    if (!userId || !selected?.trackId || !selected.audioUrl) {
      setOfflineMsg(
        'Offline download is available for entitled MintMusic deliveries with playable media.'
      );
      return;
    }
    setOfflineMsg('Downloading…');
    const { cacheTrackOffline } = await import('../lib/offline');
    const result = await cacheTrackOffline({
      userId,
      trackId: selected.trackId,
      url: selected.audioUrl,
    });
    setOfflineMsg(
      result.ok
        ? `Available offline (${Math.round((result.bytes ?? 0) / 1024)} KB). Entitlement unchanged.`
        : result.error ?? 'Download failed'
    );
  };

  const removeOffline = async () => {
    if (!userId || !selected?.trackId) return;
    const { removeOfflineTrack } = await import('../lib/offline');
    await removeOfflineTrack(userId, selected.trackId);
    setOfflineMsg('Removed local audio. Your paid entitlement remains.');
  };

  if (collectedSongs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div style={{ opacity: 0.5 }}>
          <VinylRecord artwork={{ from: '#2b2b2d', to: '#101012' }} size={220} spinning={false} reducedMotion />
        </div>
        <div>
          <p className="text-[18px] font-semibold text-white">Your crate is empty.</p>
          <p className="mt-1 text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Hear something fresh.
          </p>
        </div>
        <button
          onClick={onGoDiscover}
          className="mint-focus rounded-full px-5 py-3 text-[15px] font-semibold text-[#0A0A0B]"
          style={{ background: 'var(--mint-primary)' }}
        >
          Go to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
      {/* turntable */}
      <div className="flex flex-col items-center gap-4">
        <Turntable active={isPlayingSelected} reducedMotion={reducedMotion}>
          {(size) => (
            <button
              onClick={() => selected && void playback.toggle()}
              className="mint-focus"
              aria-label={isPlayingSelected ? 'Pause' : 'Play'}
            >
              {selected && (
                <VinylRecord
                  key={selected.id}
                  artwork={selected.artwork}
                  size={size}
                  spinning={isPlayingSelected}
                  reducedMotion={reducedMotion}
                />
              )}
            </button>
          )}
        </Turntable>
        {selected && (
          <div className="text-center">
            <p className="text-[16px] font-bold text-white">{selected.title}</p>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {selected.artist}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void downloadOffline()}
                className="mint-focus rounded-full px-3 py-2 text-[12px]"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Download for offline
              </button>
              <button
                type="button"
                onClick={() => void removeOffline()}
                className="mint-focus rounded-full px-3 py-2 text-[12px]"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Remove offline
              </button>
              <button
                type="button"
                onClick={() => selected && uncollect(selected.id)}
                className="mint-focus rounded-full px-3 py-2 text-[12px]"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Hide from crate
              </button>
            </div>
            {offlineMsg && (
              <p className="mt-2 max-w-xs text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {offlineMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* shelf */}
      <div className="w-full max-w-xl">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
            your collection
          </h2>
          <span className="text-[13px]" style={{ color: 'var(--mint-primary)' }}>
            {collectedSongs.length} {collectedSongs.length === 1 ? 'record' : 'records'}
          </span>
        </div>
        <div
          className="grid grid-cols-3 gap-4 overflow-y-auto pr-1 sm:grid-cols-4 lg:max-h-[62vh]"
          style={{
            padding: '14px',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(43,43,45,0.35), rgba(16,16,18,0.35))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {collectedSongs.map((song) => (
            <RecordSleeve
              key={song.id}
              song={song}
              active={song.id === selectedId}
              onSelect={() => void playSong(song.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
