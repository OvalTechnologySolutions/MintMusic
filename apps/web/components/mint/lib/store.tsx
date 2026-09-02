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

const KEYS = {
  session: 'mint:session',
  listener: 'mint:listener',
  artist: 'mint:artist',
  collection: 'mint:collection',
  uploads: 'mint:uploads',
  events: 'mint:events',
  playback: 'mint:playback',
  a11y: 'mint:a11y',
  tutorial: 'mint:tutorialSeen',
} as const;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

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

  // Hydrate once on mount (client only) to avoid SSR/localStorage mismatch.
  // The `hydrated` gate renders a loader until this runs, so there is no
  // cascading-render or mismatch concern despite the batched setState here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSession(load(KEYS.session, null));
    setListener(load(KEYS.listener, DEFAULT_LISTENER));
    setArtist(load(KEYS.artist, DEFAULT_ARTIST));
    setCollection(load(KEYS.collection, []));
    setUploads(load(KEYS.uploads, []));
    setEvents(load(KEYS.events, []));
    setPlayback(load(KEYS.playback, DEFAULT_PLAYBACK));
    setA11y(load(KEYS.a11y, DEFAULT_A11Y));
    setTutorialSeen(load(KEYS.tutorial, false));
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
    save(KEYS.session, session);
    save(KEYS.listener, listener);
    save(KEYS.artist, artist);
    save(KEYS.collection, collection);
    save(KEYS.uploads, uploads);
    save(KEYS.events, events);
    save(KEYS.playback, playback);
    save(KEYS.a11y, a11y);
    save(KEYS.tutorial, tutorialSeen);
  }, [hydrated, session, listener, artist, collection, uploads, events, playback, a11y, tutorialSeen]);

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
