'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { track } from './analytics';
import { SEED_CATALOG } from './catalog';
import {
  DEFAULT_A11Y,
  DEFAULT_ARTIST,
  DEFAULT_LISTENER,
  DEFAULT_PLAYBACK,
  STORAGE_KEYS,
  acceptExternalJson,
  load,
  save,
} from './persist';
import type {
  AccessibilitySettings,
  ArtistProfile,
  CollectionItem,
  DiscoveryEvent,
  DiscoveryEventType,
  Genre,
  ListenerProfile,
  MintSession,
  PlaybackSettings,
  Song,
} from './types';

function usePersistSlice<T>(hydrated: boolean, key: string, value: T) {
  const skip = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skip.current) {
      skip.current = false;
      return;
    }
    save(key, value);
  }, [hydrated, key, value]);
}

interface MintState {
  hydrated: boolean;
  session: MintSession | null;
  listener: ListenerProfile;
  artist: ArtistProfile;
  collection: CollectionItem[];
  uploads: Song[];
  events: DiscoveryEvent[];
  playback: PlaybackSettings;
  a11y: AccessibilitySettings;
  tutorialSeen: boolean;
  /** Linked wallet address (optional capability; not advertised). */
  walletAddress: string | null;

  // catalog
  catalog: Song[];
  collectedSongs: Song[];
  isCollected: (songId: string) => boolean;

  // actions
  signIn: (session: MintSession) => void;
  signOut: () => void;
  completeOnboarding: (genres: Genre[], artists: string[], displayName: string) => void;
  updateListener: (patch: Partial<ListenerProfile>) => void;
  updateArtist: (patch: Partial<ArtistProfile>) => void;
  enableArtist: (stageName: string) => void;
  publishSong: (song: Song) => void;
  collect: (song: Song) => void;
  uncollect: (songId: string) => void;
  recordEvent: (songId: string, type: DiscoveryEventType) => void;
  updatePlayback: (patch: Partial<PlaybackSettings>) => void;
  updateA11y: (patch: Partial<AccessibilitySettings>) => void;
  setWalletAddress: (address: string | null) => void;
  markTutorialSeen: () => void;
  resetTutorial: () => void;
  deleteAccount: () => void;
}

const MintContext = createContext<MintState | null>(null);

export function MintProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<MintSession | null>(null);
  const [listener, setListener] = useState<ListenerProfile>(DEFAULT_LISTENER);
  const [artist, setArtist] = useState<ArtistProfile>(DEFAULT_ARTIST);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [uploads, setUploads] = useState<Song[]>([]);
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [playback, setPlayback] = useState<PlaybackSettings>(DEFAULT_PLAYBACK);
  const [a11y, setA11y] = useState<AccessibilitySettings>(DEFAULT_A11Y);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);

  // Hydrate once on mount (client only) to avoid SSR/localStorage mismatch.
  // The `hydrated` gate renders a loader until this runs, so there is no
  // cascading-render or mismatch concern despite the batched setState here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSession(load(STORAGE_KEYS.session, null));
    setListener(load(STORAGE_KEYS.listener, DEFAULT_LISTENER));
    setArtist(load(STORAGE_KEYS.artist, DEFAULT_ARTIST));
    setCollection(load(STORAGE_KEYS.collection, []));
    setUploads(load(STORAGE_KEYS.uploads, []));
    setEvents(load(STORAGE_KEYS.events, []));
    setPlayback(load(STORAGE_KEYS.playback, DEFAULT_PLAYBACK));
    setA11y(load(STORAGE_KEYS.a11y, DEFAULT_A11Y));
    setTutorialSeen(load(STORAGE_KEYS.tutorial, false));
    setWalletAddressState(load<string | null>(STORAGE_KEYS.wallet, null));
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist each slice independently so a settings change in one tab cannot
  // rewrite a stale collection/uploads snapshot from that tab.
  usePersistSlice(hydrated, STORAGE_KEYS.session, session);
  usePersistSlice(hydrated, STORAGE_KEYS.listener, listener);
  usePersistSlice(hydrated, STORAGE_KEYS.artist, artist);
  usePersistSlice(hydrated, STORAGE_KEYS.collection, collection);
  usePersistSlice(hydrated, STORAGE_KEYS.uploads, uploads);
  usePersistSlice(hydrated, STORAGE_KEYS.events, events);
  usePersistSlice(hydrated, STORAGE_KEYS.playback, playback);
  usePersistSlice(hydrated, STORAGE_KEYS.a11y, a11y);
  usePersistSlice(hydrated, STORAGE_KEYS.tutorial, tutorialSeen);
  usePersistSlice(hydrated, STORAGE_KEYS.wallet, walletAddress);

  // Adopt writes from other tabs so this tab cannot later persist a stale crate.
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;

      if (event.key === null) {
        setSession(null);
        setListener(DEFAULT_LISTENER);
        setArtist(DEFAULT_ARTIST);
        setCollection([]);
        setUploads([]);
        setEvents([]);
        setPlayback(DEFAULT_PLAYBACK);
        setA11y(DEFAULT_A11Y);
        setTutorialSeen(false);
        setWalletAddressState(null);
        return;
      }

      const raw = event.newValue;
      switch (event.key) {
        case STORAGE_KEYS.session:
          setSession((prev) => (raw == null ? null : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.listener:
          setListener((prev) => (raw == null ? DEFAULT_LISTENER : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.artist:
          setArtist((prev) => (raw == null ? DEFAULT_ARTIST : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.collection:
          setCollection((prev) => (raw == null ? [] : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.uploads:
          setUploads((prev) => (raw == null ? [] : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.events:
          setEvents((prev) => (raw == null ? [] : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.playback:
          setPlayback((prev) => (raw == null ? DEFAULT_PLAYBACK : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.a11y:
          setA11y((prev) => (raw == null ? DEFAULT_A11Y : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.tutorial:
          setTutorialSeen((prev) => (raw == null ? false : acceptExternalJson(prev, raw)));
          break;
        case STORAGE_KEYS.wallet:
          setWalletAddressState((prev) => (raw == null ? null : acceptExternalJson(prev, raw)));
          break;
        default:
          break;
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrated]);

  const catalog = useMemo<Song[]>(() => {
    const published = uploads.filter((s) => s.status === 'published' && s.eligibleForDiscovery);
    return [...published, ...SEED_CATALOG];
  }, [uploads]);

  const collectedSongs = useMemo<Song[]>(() => {
    const byId = new Map(catalog.map((s) => [s.id, s]));
    return collection
      .slice()
      .sort((a, b) => (a.collectedAt < b.collectedAt ? 1 : -1))
      .map((c) => byId.get(c.songId))
      .filter((s): s is Song => Boolean(s));
  }, [collection, catalog]);

  const isCollected = useCallback(
    (songId: string) => collection.some((c) => c.songId === songId),
    [collection],
  );

  const recordEvent = useCallback((songId: string, type: DiscoveryEventType) => {
    setEvents((prev) => [...prev.slice(-499), { songId, type, at: new Date().toISOString() }]);
  }, []);

  const signIn = useCallback((s: MintSession) => {
    setSession(s);
    setListener((prev) => ({ ...prev, displayName: prev.displayName || s.name }));
    track('auth_completed', { provider: s.provider });
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const completeOnboarding = useCallback(
    (genres: Genre[], artists: string[], displayName: string) => {
      setListener((prev) => ({
        ...prev,
        favoriteGenres: genres,
        favoriteArtists: artists,
        displayName: displayName || prev.displayName,
        onboarded: true,
      }));
      track('onboarding_completed', { genres: genres.length, artists: artists.length });
    },
    [],
  );

  const updateListener = useCallback(
    (patch: Partial<ListenerProfile>) => setListener((prev) => ({ ...prev, ...patch })),
    [],
  );

  const updateArtist = useCallback(
    (patch: Partial<ArtistProfile>) => setArtist((prev) => ({ ...prev, ...patch })),
    [],
  );

  const enableArtist = useCallback((stageName: string) => {
    setArtist((prev) => ({ ...prev, enabled: true, stageName: prev.stageName || stageName }));
    track('artist_profile_enabled');
  }, []);

  const publishSong = useCallback((song: Song) => {
    setUploads((prev) => [song, ...prev]);
    track('song_published', { songId: song.id });
  }, []);

  const collect = useCallback(
    (song: Song) => {
      setCollection((prev) =>
        prev.some((c) => c.songId === song.id)
          ? prev
          : [...prev, { songId: song.id, collectedAt: new Date().toISOString() }],
      );
      recordEvent(song.id, 'collect');
      track('track_collected', { songId: song.id });
    },
    [recordEvent],
  );

  const uncollect = useCallback((songId: string) => {
    setCollection((prev) => prev.filter((c) => c.songId !== songId));
  }, []);

  const updatePlayback = useCallback(
    (patch: Partial<PlaybackSettings>) => setPlayback((prev) => ({ ...prev, ...patch })),
    [],
  );
  const updateA11y = useCallback(
    (patch: Partial<AccessibilitySettings>) => setA11y((prev) => ({ ...prev, ...patch })),
    [],
  );
  const setWalletAddress = useCallback((address: string | null) => setWalletAddressState(address), []);
  const markTutorialSeen = useCallback(() => setTutorialSeen(true), []);
  const resetTutorial = useCallback(() => setTutorialSeen(false), []);

  const deleteAccount = useCallback(() => {
    setSession(null);
    setListener(DEFAULT_LISTENER);
    setArtist(DEFAULT_ARTIST);
    setCollection([]);
    setUploads([]);
    setEvents([]);
    setTutorialSeen(false);
    setWalletAddressState(null);
  }, []);

  const value: MintState = {
    hydrated,
    session,
    listener,
    artist,
    collection,
    uploads,
    events,
    playback,
    a11y,
    tutorialSeen,
    walletAddress,
    catalog,
    collectedSongs,
    isCollected,
    signIn,
    signOut,
    completeOnboarding,
    updateListener,
    updateArtist,
    enableArtist,
    publishSong,
    collect,
    uncollect,
    recordEvent,
    updatePlayback,
    updateA11y,
    setWalletAddress,
    markTutorialSeen,
    resetTutorial,
    deleteAccount,
  };

  return <MintContext.Provider value={value}>{children}</MintContext.Provider>;
}

export function useMint(): MintState {
  const ctx = useContext(MintContext);
  if (!ctx) throw new Error('useMint must be used within a MintProvider');
  return ctx;
}
