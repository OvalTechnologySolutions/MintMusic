import type { ArtistProfile, ArtistProfileUpdate } from '../artist/profile';

export interface ApiErrorBody {
  error: string;
  details?: string[];
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  service: 'mintmusic-api';
}

export interface GetArtistProfileResponse {
  profile: ArtistProfile | null;
}

export interface PutArtistProfileRequest extends ArtistProfileUpdate {}

export interface PutArtistProfileResponse {
  profile: ArtistProfile;
}

/** Future: releases, MusicMoments, brand opportunities */
export type FeatureFlag =
  | 'releases'
  | 'music_moments'
  | 'brand_marketplace'
  | 'analytics';

export interface ApiCapabilitiesResponse {
  version: string;
  features: Record<FeatureFlag, 'planned' | 'beta' | 'live'>;
}
