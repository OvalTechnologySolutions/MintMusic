'use client';

import { useState } from 'react';
import { useMint } from '../lib/store';
import { GENRES, type Genre } from '../lib/types';
import { Button, Chip, Sheet } from '../ui/primitives';

/** One compact sheet: favorite genres (+ optional artists), then into Discover. */
export function OnboardingSheet({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { completeOnboarding, listener } = useMint();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [artistInput, setArtistInput] = useState('');
  const [artists, setArtists] = useState<string[]>([]);

  const toggle = (g: Genre) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const addArtist = () => {
    const v = artistInput.trim();
    if (v && !artists.includes(v)) setArtists((prev) => [...prev, v]);
    setArtistInput('');
  };

  const finish = (withData: boolean) => {
    completeOnboarding(withData ? genres : [], withData ? artists : [], listener.displayName);
    onDone();
  };

  return (
    <Sheet open={open} onClose={() => finish(false)} title="Set your taste" side="bottom" labelledBy="onboarding-title">
      <p className="mb-4 text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Pick a few genres so we can stock your crate.
      </p>
      <p className="mb-2 text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Favorite genres
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Chip key={g} label={g} selected={genres.includes(g)} onClick={() => toggle(g)} />
        ))}
      </div>

      <p className="mb-2 text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Favorite artists (optional)
      </p>
      <div className="mb-2 flex gap-2">
        <input
          value={artistInput}
          onChange={(e) => setArtistInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addArtist();
            }
          }}
          placeholder="Search / add an artist"
          className="mint-focus flex-1 rounded-xl bg-transparent px-4 py-3 text-[14px] text-white"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <Button variant="outline" onClick={addArtist}>
          Add
        </Button>
      </div>
      {artists.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {artists.map((a) => (
            <Chip key={a} label={`${a}  ✕`} selected onClick={() => setArtists((prev) => prev.filter((x) => x !== a))} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={() => finish(true)}>
          Start listening
        </Button>
        <button onClick={() => finish(false)} className="mint-focus text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Skip
        </button>
      </div>
    </Sheet>
  );
}
