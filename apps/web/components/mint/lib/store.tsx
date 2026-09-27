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
  STORAGE_KEYS,
  deleteAccountSlices,
  loadAccountSlice,
  readStorage,
  saveAccountSlice,
  writeStorage,
} from './storage';
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

const DEFAULT_LISTENER: ListenerProfile = {
  displayName: '',
  favoriteGenres: [],
  favoriteArtists: [],
  onboarded: false,
};

const DEFAULT_ARTIST: ArtistProfile = {
  enabled: false,
  stageName: '',
  bio: '',
  genres: [],
  links: [],
};

const DEFAULT_PLAYBACK: PlaybackSettings = {
  audioQuality: 'standard',
  autoplay: true,
  allowExplicit: true,
};

const DEFAULT_A11Y: AccessibilitySettings = { reducedMotion: false };

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
    const storedSession = readStorage<MintSession | null>(STORAGE_KEYS.session, null);
    const email = storedSession?.email ?? null;
    setSession(storedSession);
    setListener(loadAccountSlice(STORAGE_KEYS.listener, email, DEFAULT_LISTENER));
    setArtist(loadAccountSlice(STORAGE_KEYS.artist, email, DEFAULT_ARTIST));
    setCollection(loadAccountSlice(STORAGE_KEYS.collection, email, []));
    setUploads(loadAccountSlice(STORAGE_KEYS.uploads, email, []));
    setEvents(loadAccountSlice(STORAGE_KEYS.events, email, []));
    setPlayback(readStorage(STORAGE_KEYS.playback, DEFAULT_PLAYBACK));
    setA11y(readStorage(STORAGE_KEYS.a11y, DEFAULT_A11Y));
    setTutorialSeen(readStorage(STORAGE_KEYS.tutorial, false));
    setWalletAddressState(
      loadAccountSlice<string | null>(STORAGE_KEYS.wallet, email, null),
    );
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist slices when they change (post-hydration).
  const first = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const email = session?.email ?? null;
    writeStorage(STORAGE_KEYS.session, session);
    saveAccountSlice(STORAGE_KEYS.listener, email, listener);
    saveAccountSlice(STORAGE_KEYS.artist, email, artist);
    saveAccountSlice(STORAGE_KEYS.collection, email, collection);
    saveAccountSlice(STORAGE_KEYS.uploads, email, uploads);
    saveAccountSlice(STORAGE_KEYS.events, email, events);
    writeStorage(STORAGE_KEYS.playback, playback);
    writeStorage(STORAGE_KEYS.a11y, a11y);
    writeStorage(STORAGE_KEYS.tutorial, tutorialSeen);
    saveAccountSlice(STORAGE_KEYS.wallet, email, walletAddress);
  }, [hydrated, session, listener, artist, collection, uploads, events, playback, a11y, tutorialSeen, walletAddress]);

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

  const applyAccount = useCallback((email: string | null | undefined, displayName?: string) => {
    const loadedListener = loadAccountSlice(STORAGE_KEYS.listener, email, DEFAULT_LISTENER);
    setListener({
      ...loadedListener,
      displayName: loadedListener.displayName || displayName || '',
    });
    setArtist(loadAccountSlice(STORAGE_KEYS.artist, email, DEFAULT_ARTIST));
    setCollection(loadAccountSlice(STORAGE_KEYS.collection, email, []));
    setUploads(loadAccountSlice(STORAGE_KEYS.uploads, email, []));
    setEvents(loadAccountSlice(STORAGE_KEYS.events, email, []));
    setWalletAddressState(
      loadAccountSlice<string | null>(STORAGE_KEYS.wallet, email, null),
    );
  }, []);

  const signIn = useCallback(
    (s: MintSession) => {
      setSession(s);
      applyAccount(s.email, s.name);
      track('auth_completed', { provider: s.provider });
    },
    [applyAccount],
  );

  const signOut = useCallback(() => {
    setSession(null);
    setListener(DEFAULT_LISTENER);
    setArtist(DEFAULT_ARTIST);
    setCollection([]);
    setUploads([]);
    setEvents([]);
    setWalletAddressState(null);
  }, []);

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
    deleteAccountSlices(session?.email);
    setSession(null);
    setListener(DEFAULT_LISTENER);
    setArtist(DEFAULT_ARTIST);
    setCollection([]);
    setUploads([]);
    setEvents([]);
    setTutorialSeen(false);
    setWalletAddressState(null);
  }, [session?.email]);

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
