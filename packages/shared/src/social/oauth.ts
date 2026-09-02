import type { SocialPlatform } from './platforms.js';

/**
 * Platforms we plan to support via official OAuth (in addition to manual URLs).
 * Status drives UI copy and API behavior until integrations ship.
 */
export type SocialOAuthPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'spotify'
  | 'apple_music'
  | 'soundcloud';

export type SocialOAuthStatus = 'manual_only' | 'oauth_planned' | 'oauth_live';

export interface SocialOAuthProviderConfig {
  platform: SocialOAuthPlatform;
  label: string;
  status: SocialOAuthStatus;
  /** Env key prefix for client id, e.g. INSTAGRAM */
  envPrefix: string;
  scopes?: string[];
}

export const SOCIAL_OAUTH_PROVIDERS: Record<
  SocialOAuthPlatform,
  SocialOAuthProviderConfig
> = {
  instagram: {
    platform: 'instagram',
    label: 'Instagram',
    status: 'oauth_planned',
    envPrefix: 'INSTAGRAM',
    scopes: ['instagram_basic'],
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    status: 'oauth_planned',
    envPrefix: 'GOOGLE',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok',
    status: 'oauth_planned',
    envPrefix: 'TIKTOK',
  },
  spotify: {
    platform: 'spotify',
    label: 'Spotify',
    status: 'oauth_planned',
    envPrefix: 'SPOTIFY',
    scopes: ['user-read-email', 'user-read-private'],
  },
  apple_music: {
    platform: 'apple_music',
    label: 'Apple Music',
    status: 'manual_only',
    envPrefix: 'APPLE_MUSIC',
  },
  soundcloud: {
    platform: 'soundcloud',
    label: 'SoundCloud',
    status: 'oauth_planned',
    envPrefix: 'SOUNDCLOUD',
  },
};

export interface SocialConnectInitResponse {
  platform: SocialOAuthPlatform;
  mode: 'manual' | 'oauth_redirect';
  /** Present when mode is oauth_redirect */
  authorizeUrl?: string;
  message?: string;
}
