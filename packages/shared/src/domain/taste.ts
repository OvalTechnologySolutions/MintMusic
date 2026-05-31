export type TastePlatform = 'spotify' | 'apple_music' | 'soundcloud' | 'tiktok';

export interface TasteProfileSummary {
  topGenres: Array<{ name: string; weight: number }>;
  topArtists: Array<{ name: string; weight: number }>;
  topTracks: Array<{ name: string; artist: string; weight: number }>;
  sourceSummary: Partial<Record<TastePlatform, { syncedAt: string; itemCount: number }>>;
  updatedAt: string;
}

export interface TasteConnectInitResponse {
  platform: TastePlatform;
  authorizeUrl: string | null;
  message?: string;
}

/** Stored after OAuth redirect — tokens encrypted at rest */
export interface TasteOAuthCallbackRequest {
  platform: TastePlatform;
  code: string;
  redirectUri: string;
}
