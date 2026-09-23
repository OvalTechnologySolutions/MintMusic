'use client';

import { useState } from 'react';
import { SONG_SAVE_UNITS, formatMint, saveSong } from '../lib/billing-api';
import type { Song } from '../lib/types';
import { Button, Sheet } from '../ui/primitives';

export function SaveConfirmSheet({
  open,
  song,
  firstSave,
  onClose,
  onSaved,
  onNeedMint,
}: {
  open: boolean;
  song: Song | null;
  firstSave: boolean;
  onClose: () => void;
  onSaved: (song: Song) => void;
  onNeedMint: (song: Song) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!song) return;
    setBusy(true);
    setError(null);

    // Local / seed tracks without deliverable media: local collect only.
    if (!song.saveEligible || !song.trackId) {
      onSaved(song);
      setBusy(false);
      onClose();
      return;
    }

    try {
      const key = `save:${song.trackId}:${crypto.randomUUID()}`;
      await saveSong(song.trackId, key);
      onSaved(song);
      onClose();
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 402) {
        onNeedMint(song);
        onClose();
      } else {
        setError(e.message || 'Save failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Save to library">
      <div className="flex flex-col gap-4 px-1 pb-6">
        {song && (
          <>
            <p className="text-[16px] font-semibold text-white">{song.title}</p>
            <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {song.artist}
            </p>
          </>
        )}
        {firstSave && song?.saveEligible && (
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Saving costs {formatMint(SONG_SAVE_UNITS)} Mint and grants account-based playback plus
            eligible offline listening inside MintMusic. Repeat plays and re-saves of entitled songs
            are free.
          </p>
        )}
        {song?.saveEligible ? (
          <p className="text-[14px]" style={{ color: 'var(--mint-primary)' }}>
            Cost: {formatMint(SONG_SAVE_UNITS)} Mint
          </p>
        ) : (
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Preview catalog tracks can be shelved locally. Paid saves apply to MintMusic-delivered
            releases.
          </p>
        )}
        {error && (
          <p className="text-[13px]" style={{ color: '#F07178' }} role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" full onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button full disabled={busy} onClick={() => void confirm()}>
            {busy ? 'Saving…' : song?.saveEligible ? 'Save · 0.25 Mint' : 'Add to crate'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
