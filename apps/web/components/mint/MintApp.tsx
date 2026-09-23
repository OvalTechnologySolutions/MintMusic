'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Web3Provider from '@/components/Web3Provider';
import { ArtistExperience } from './artist/ArtistExperience';
import { ArtistSubscriptionPanel } from './artist/ArtistSubscriptionPanel';
import { MintMusicMark } from './brand/MintMusicMark';
import { CollectionExperience } from './collection/CollectionExperience';
import { DiscoveryExperience } from './discovery/DiscoveryExperience';
import { AuthLanding } from './landing/AuthLanding';
import { OnboardingSheet } from './landing/OnboardingSheet';
import { CrateBackground } from './layout/CrateBackground';
import { TopBar, type AppMode } from './layout/TopBar';
import { fetchWallet } from './lib/billing-api';
import { clearOfflineForUser } from './lib/offline';
import { PlaybackProvider } from './lib/playback';
import { MintProvider, useMint } from './lib/store';
import type { MintSession, Song } from './lib/types';
import { ProfileSettingsSheet } from './profile/ProfileSettingsSheet';
import { AddMintSheet } from './wallet/AddMintSheet';
import { WalletHistorySheet } from './wallet/WalletHistorySheet';

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
  const { data: authSession, status: authStatus } = useSession();
  const { hydrated, session, listener, artist, signIn, signOut: localSignOut } = useMint();
  const [mode, setMode] = useState<AppMode>('discover');
  const [profileOpen, setProfileOpen] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [balanceUnits, setBalanceUnits] = useState<number | null>(null);
  const [pendingSaveSong, setPendingSaveSong] = useState<Song | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  // Bridge NextAuth → Mint session
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authSession?.user?.email && authSession.user.id) {
      const provider =
        (authSession.user as { provider?: string }).provider === 'github'
          ? 'github'
          : 'google';
      signIn({
        email: authSession.user.email,
        name: authSession.user.name ?? authSession.user.email,
        provider,
        userId: authSession.user.id,
        role: authSession.user.role,
        creatorStatus: authSession.user.creatorStatus,
      });
    }
  }, [authSession, authStatus, signIn]);

  // Wallet balance for authenticated users
  useEffect(() => {
    if (!session?.userId) {
      setBalanceUnits(null);
      return;
    }
    let cancelled = false;
    const load = () =>
      fetchWallet()
        .then((w) => {
          if (!cancelled) setBalanceUnits(w.balanceUnits);
        })
        .catch(() => {
          if (!cancelled) setBalanceUnits(null);
        });
    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session?.userId, walletOpen]);

  // Checkout return messaging + pending save restore
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mint = params.get('mint');
    if (mint === 'success') {
      setCheckoutBanner('Mint purchase received. Balance updates after payment confirmation.');
      void fetchWallet()
        .then((w) => setBalanceUnits(w.balanceUnits))
        .catch(() => undefined);
      const pending = sessionStorage.getItem('mint:pendingSave');
      if (pending) {
        try {
          setPendingSaveSong(JSON.parse(pending) as Song);
        } catch {
          /* ignore */
        }
      }
      window.history.replaceState({}, '', '/');
    } else if (mint === 'canceled') {
      setCheckoutBanner('Checkout canceled. No Mint was added.');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  if (!hydrated || authStatus === 'loading') return <BrandLoader />;
  if (!session) {
    return (
      <AuthLanding
        onDemoSignIn={(s: MintSession) => signIn(s)}
      />
    );
  }

  const avatarInitial = (listener.displayName || session.name || 'L').slice(0, 1).toUpperCase();

  const openArtist = (slug: string) => {
    const ownerSlug = slugify(artist.stageName);
    if (artist.enabled && slug === ownerSlug) setPublicSlug(null);
    else setPublicSlug(slug);
    setMode('artist');
  };

  const changeMode = (m: AppMode) => {
    if (m === 'artist') setPublicSlug(null);
    setMode(m);
  };

  const handleSignOut = async () => {
    if (session.userId) await clearOfflineForUser(session.userId);
    localSignOut();
    if (session.provider !== 'demo') {
      await signOut({ callbackUrl: '/' });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ color: 'var(--paper-white)' }}>
      <CrateBackground />
      <TopBar
        mode={mode}
        onMode={changeMode}
        onProfile={() => setProfileOpen(true)}
        onWallet={() => setWalletOpen(true)}
        avatarInitial={avatarInitial}
        balanceUnits={balanceUnits}
      />

      {checkoutBanner && (
        <div
          className="mx-auto mt-2 max-w-lg px-4 text-center text-[13px]"
          style={{ color: 'var(--mint-primary)' }}
          role="status"
        >
          {checkoutBanner}
          <button
            className="ml-2 underline"
            onClick={() => setCheckoutBanner(null)}
            type="button"
          >
            dismiss
          </button>
        </div>
      )}

      <main className="mint-safe-x flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-2">
        {mode === 'discover' && (
          <DiscoveryExperience
            onOpenArtist={openArtist}
            onNeedMint={(song) => {
              sessionStorage.setItem('mint:pendingSave', JSON.stringify(song));
              setPendingSaveSong(song);
              setWalletOpen(true);
            }}
            resumeSaveSong={pendingSaveSong}
            onResumeSaveHandled={() => {
              setPendingSaveSong(null);
              sessionStorage.removeItem('mint:pendingSave');
            }}
            onBalanceMaybeChanged={() => {
              void fetchWallet()
                .then((w) => setBalanceUnits(w.balanceUnits))
                .catch(() => undefined);
            }}
          />
        )}
        {mode === 'collection' && (
          <CollectionExperience
            onGoDiscover={() => setMode('discover')}
            userId={session.userId}
          />
        )}
        {mode === 'artist' && (
          <div className="flex w-full max-w-lg flex-col gap-4">
            {session.userId && artist.enabled && <ArtistSubscriptionPanel />}
            <ArtistExperience
              publicSlug={publicSlug}
              uploadOpen={uploadOpen}
              onUploadOpenChange={setUploadOpen}
            />
          </div>
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
        onOpenWallet={() => {
          setProfileOpen(false);
          setWalletOpen(true);
        }}
        onOpenHistory={() => {
          setProfileOpen(false);
          setHistoryOpen(true);
        }}
        onSignOut={handleSignOut}
        balanceUnits={balanceUnits}
      />

      <AddMintSheet
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        pendingTrackTitle={pendingSaveSong?.title}
      />
      <WalletHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

export function MintApp() {
  return (
    <Web3Provider>
      <MintProvider>
        <PlaybackProvider>
          <div style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}>
            <Shell />
          </div>
        </PlaybackProvider>
      </MintProvider>
    </Web3Provider>
  );
}
