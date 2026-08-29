/** Shared domain types for the MintMusic record-player experience. */

export type DiscoveryEventType = 'play' | 'skip' | 'collect';

export type SongVersion =
  | 'original'
  | 'remix'
  | 'acoustic'
  | 'live'
  | 'demo'
  | 'other';

export type SongStatus = 'draft' | 'processing' | 'ready' | 'published' | 'error';

export type CreditRole =
  | 'Primary Artist'
  | 'Featured Artist'
  | 'Producer'
  | 'Songwriter'
  | 'Recording Engineer'
  | 'Mixing Engineer'
  | 'Mastering Engineer';

export const CREDIT_ROLES: CreditRole[] = [
  'Primary Artist',
  'Featured Artist',
  'Producer',
  'Songwriter',
  'Recording Engineer',
  'Mixing Engineer',
  'Mastering Engineer',
];

export const GENRES = [
  'Hip-Hop',
  'R&B',
  'Pop',
  'Rock',
  'Electronic',
  'Jazz',
  'Soul',
  'Alternative',
  'Country',
  'Afrobeats',
  'Reggae',
  'Latin',
  'Classical',
  'Other',
] as const;

export type Genre = (typeof GENRES)[number];

export interface SongCredit {
  role: CreditRole;
  name: string;
}

/** Artwork is stored as a two-stop gradient (brand-safe) plus an optional
 *  uploaded image (data URL). This keeps the sample catalog binary-free while
 *  letting real uploads render their own cover. */
export interface Artwork {
  from: string;
  to: string;
  imageUrl?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  artwork: Artwork;
  genres: Genre[];
  releaseDate?: string;
  explicit: boolean;
  isrc?: string;
  version: SongVersion;
  notes?: string;
  credits: SongCredit[];
  durationSec: number;
  /** 'synth' = generated Web Audio tone; 'file' = a real uploaded audio URL. */
  audioKind: 'synth' | 'file';
  audioUrl?: string;
  /** Musical seed used by the synth engine (root note in Hz + scale offsets). */
  synthSeed: number;
  status: SongStatus;
  eligibleForDiscovery: boolean;
  uploadedByUser?: boolean;
}

export interface ListenerProfile {
  displayName: string;
  favoriteGenres: Genre[];
  favoriteArtists: string[];
  onboarded: boolean;
}

export interface ArtistProfile {
  enabled: boolean;
  stageName: string;
  bio: string;
  genres: Genre[];
  links: string[];
  imageUrl?: string;
}

export interface CollectionItem {
  songId: string;
  collectedAt: string;
}

export interface DiscoveryEvent {
  songId: string;
  type: DiscoveryEventType;
  at: string;
}

export interface MintSession {
  email: string;
  name: string;
  provider: 'google' | 'email';
}

export interface PlaybackSettings {
  audioQuality: 'standard' | 'high';
  autoplay: boolean;
  allowExplicit: boolean;
}

export interface AccessibilitySettings {
  reducedMotion: boolean; // user override; system preference also respected
}
