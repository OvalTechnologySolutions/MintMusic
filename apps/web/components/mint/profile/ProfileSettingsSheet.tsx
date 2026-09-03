'use client';

import { useEffect } from 'react';
import { track } from '../lib/analytics';
import { usePlayback } from '../lib/playback';
import { useMint } from '../lib/store';
import { GENRES, type Genre } from '../lib/types';
import { useIsDesktop } from '../lib/useIsDesktop';
import { Button, Chip, Sheet, Toggle } from '../ui/primitives';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t py-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--mint-primary)' }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function RowItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[14px] text-white/85">{label}</span>
      {children}
    </div>
  );
}

export function ProfileSettingsSheet({
  open,
  onClose,
  onViewArtist,
  onManageUploads,
}: {
  open: boolean;
  onClose: () => void;
  onViewArtist: () => void;
  onManageUploads: () => void;
}) {
  const {
    session,
    listener,
    artist,
    playback: playbackSettings,
    a11y,
    updateListener,
    updateArtist,
    enableArtist,
    updatePlayback,
    updateA11y,
    signOut,
    deleteAccount,
    resetTutorial,
  } = useMint();
  const playback = usePlayback();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (open) track('pwa_install_prompt_viewed');
  }, [open]);

  const toggleGenre = (g: Genre) =>
    updateListener({
      favoriteGenres: listener.favoriteGenres.includes(g)
        ? listener.favoriteGenres.filter((x) => x !== g)
        : [...listener.favoriteGenres, g],
    });

  return (
    <Sheet open={open} onClose={onClose} title="Profile & Settings" side={isDesktop ? 'right' : 'bottom'} labelledBy="profile-title">
      {/* Listener identity */}
      <div className="flex items-center gap-4 pb-2">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-[#0A0A0B]"
          style={{ background: 'linear-gradient(135deg, var(--mint-primary), var(--mint-deep))' }}
        >
          {(listener.displayName || session?.name || 'L').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold text-white">{listener.displayName || session?.name || 'Listener'}</p>
          <p className="truncate text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {session?.email}
          </p>
        </div>
      </div>

      <Section title="Listener Identity">
        <label className="mb-1 block text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Display name
        </label>
        <input
          value={listener.displayName}
          onChange={(e) => updateListener({ displayName: e.target.value })}
          className="mint-focus mb-4 w-full rounded-xl bg-transparent px-4 py-2.5 text-[14px] text-white"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <p className="mb-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Favorite genres
        </p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Chip key={g} label={g} selected={listener.favoriteGenres.includes(g)} onClick={() => toggleGenre(g)} />
          ))}
        </div>
      </Section>

      <Section title="Artist Identity">
        <RowItem label="Enable Artist Homepage">
          <Toggle
            checked={artist.enabled}
            onChange={(v) => (v ? enableArtist(artist.stageName || 'New Artist') : updateArtist({ enabled: false }))}
            label="Enable Artist Homepage"
          />
        </RowItem>
        {artist.enabled && (
          <div className="mt-2 space-y-3">
            <input
              value={artist.stageName}
              onChange={(e) => updateArtist({ stageName: e.target.value })}
              placeholder="Artist / stage name"
              className="mint-focus w-full rounded-xl bg-transparent px-4 py-2.5 text-[14px] text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <textarea
              value={artist.bio}
              onChange={(e) => updateArtist({ bio: e.target.value })}
              rows={2}
              placeholder="Short bio"
              className="mint-focus w-full resize-none rounded-xl bg-transparent px-4 py-2.5 text-[14px] text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={onManageUploads}>
                Manage uploads
              </Button>
              <Button variant="outline" onClick={onViewArtist}>
                View Artist Homepage
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Playback">
        <RowItem label="Audio quality">
          <select
            value={playbackSettings.audioQuality}
            onChange={(e) => updatePlayback({ audioQuality: e.target.value as 'standard' | 'high' })}
            className="mint-focus rounded-lg bg-[#17181b] px-3 py-2 text-[13px] text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <option value="standard">Standard</option>
            <option value="high">High</option>
          </select>
        </RowItem>
        <RowItem label="Autoplay next record">
          <Toggle checked={playbackSettings.autoplay} onChange={(v) => updatePlayback({ autoplay: v })} label="Autoplay" />
        </RowItem>
        <RowItem label="Allow explicit content">
          <Toggle checked={playbackSettings.allowExplicit} onChange={(v) => updatePlayback({ allowExplicit: v })} label="Allow explicit" />
        </RowItem>
      </Section>

      <Section title="Accessibility">
        <RowItem label="Reduced motion">
          <Toggle checked={a11y.reducedMotion} onChange={(v) => updateA11y({ reducedMotion: v })} label="Reduced motion" />
        </RowItem>
        <button onClick={resetTutorial} className="mint-focus mt-1 text-[13px]" style={{ color: 'var(--mint-primary)' }}>
          Reset swipe tutorial
        </button>
      </Section>

      <Section title="App">
        <p className="mb-2 text-[13px] text-white/80">Add MintMusic to your Home Screen</p>
        <ol className="space-y-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <li>1. Tap the Share icon</li>
          <li>2. Tap “Add to Home Screen”</li>
          <li>3. Tap “Add”</li>
        </ol>
        <p className="mt-3 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          MintMusic · v0.2.0
        </p>
      </Section>

      <Section title="Account">
        <RowItem label="Email">
          <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {session?.email ?? '—'}
          </span>
        </RowItem>
        <RowItem label="Signed in with">
          <span className="text-[13px] capitalize" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {session?.provider ?? '—'}
          </span>
        </RowItem>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              playback.pause();
              signOut();
            }}
          >
            Sign out
          </Button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.confirm('Delete your account data on this device?')) {
                deleteAccount();
              }
            }}
            className="mint-focus px-4 text-[14px]"
            style={{ color: '#ff8a8a' }}
          >
            Delete account
          </button>
        </div>
      </Section>
    </Sheet>
  );
}
