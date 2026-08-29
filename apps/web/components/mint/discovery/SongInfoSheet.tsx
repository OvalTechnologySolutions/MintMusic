'use client';

import type { Song } from '../lib/types';
import { useIsDesktop } from '../lib/useIsDesktop';
import { Button, Sheet } from '../ui/primitives';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </span>
      <span className="text-right text-[14px] text-white/90">{value}</span>
    </div>
  );
}

export function SongInfoSheet({
  song,
  open,
  onClose,
  onToggleCollect,
  collected,
  onOpenArtist,
}: {
  song: Song | null;
  open: boolean;
  onClose: () => void;
  onToggleCollect: () => void;
  collected: boolean;
  onOpenArtist: () => void;
}) {
  const isDesktop = useIsDesktop();
  if (!song) return null;

  return (
    <Sheet open={open} onClose={onClose} title={song.title} side={isDesktop ? 'right' : 'bottom'} labelledBy="song-info-title">
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"
          style={{ background: `linear-gradient(135deg, ${song.artwork.from}, ${song.artwork.to})` }}
        >
          {song.artwork.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.artwork.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white">{song.artist}</p>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {song.genres.join(' · ')}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onToggleCollect}>
          {collected ? 'Collected ✓' : 'Collect →'}
        </Button>
        <Button variant="outline" onClick={onOpenArtist}>
          Artist Profile
        </Button>
      </div>

      <div className="mt-6">
        {song.releaseDate && <Row label="Release" value={song.releaseDate} />}
        <Row label="Version" value={song.version} />
        <Row label="Explicit" value={song.explicit ? 'Yes' : 'No'} />
        {song.isrc && <Row label="ISRC" value={song.isrc} />}
      </div>

      {song.credits.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Credits
          </p>
          <div className="space-y-1.5">
            {song.credits.map((c, i) => (
              <div key={`${c.role}-${i}`} className="flex justify-between text-[14px]">
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{c.role}</span>
                <span className="text-white/90">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {song.notes && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Artist notes
          </p>
          <p className="text-[14px] leading-relaxed text-white/80">{song.notes}</p>
        </div>
      )}
    </Sheet>
  );
}
