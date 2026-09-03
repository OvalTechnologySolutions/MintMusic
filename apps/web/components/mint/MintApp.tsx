'use client';

import { useState } from 'react';
import { ArtistExperience } from './artist/ArtistExperience';
import { MintMusicMark } from './brand/MintMusicMark';
import { CollectionExperience } from './collection/CollectionExperience';
import { DiscoveryExperience } from './discovery/DiscoveryExperience';
import { AuthLanding } from './landing/AuthLanding';
import { OnboardingSheet } from './landing/OnboardingSheet';
import { CrateBackground } from './layout/CrateBackground';
import { TopBar, type AppMode } from './layout/TopBar';
import { PlaybackProvider } from './lib/playback';
import { MintProvider, useMint } from './lib/store';
import { ProfileSettingsSheet } from './profile/ProfileSettingsSheet';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'artist';

function BrandLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center" style={{ background: 'var(--onyx)' }}>
      <div className="mint-spin">
        <MintMusicMark size={64} />
      </div>
    </div>
  );
}

function Shell() {
  const { hydrated, session, listener, artist, signIn } = useMint();
  const [mode, setMode] = useState<AppMode>('discover');
  const [profileOpen, setProfileOpen] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  if (!hydrated) return <BrandLoader />;
  if (!session) return <AuthLanding onSignIn={signIn} />;

  const avatarInitial = (listener.displayName || session.name || 'L').slice(0, 1).toUpperCase();

  const openArtist = (slug: string) => {
    const ownerSlug = slugify(artist.stageName);
    if (artist.enabled && slug === ownerSlug) setPublicSlug(null);
    else setPublicSlug(slug);
    setMode('artist');
  };

  const changeMode = (m: AppMode) => {
    if (m === 'artist') setPublicSlug(null); // owner homepage via the tab
    setMode(m);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ color: 'var(--paper-white)' }}>
      <CrateBackground />
      <TopBar mode={mode} onMode={changeMode} onProfile={() => setProfileOpen(true)} avatarInitial={avatarInitial} />

      <main className="mint-safe-x flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-2">
        {mode === 'discover' && <DiscoveryExperience onOpenArtist={openArtist} />}
        {mode === 'collection' && <CollectionExperience onGoDiscover={() => setMode('discover')} />}
        {mode === 'artist' && (
          <ArtistExperience publicSlug={publicSlug} uploadOpen={uploadOpen} onUploadOpenChange={setUploadOpen} />
        )}
      </main>

      <OnboardingSheet open={!listener.onboarded} onDone={() => setMode('discover')} />

      <ProfileSettingsSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onViewArtist={() => {
          setPublicSlug(null);
          setMode('artist');
          setProfileOpen(false);
        }}
        onManageUploads={() => {
          setPublicSlug(null);
          setMode('artist');
          setProfileOpen(false);
          setUploadOpen(true);
        }}
      />
    </div>
  );
}

export function MintApp() {
  return (
    <MintProvider>
      <PlaybackProvider>
        <Shell />
      </PlaybackProvider>
    </MintProvider>
  );
}
