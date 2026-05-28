import type { SocialLinkInput } from '../social/validate';

export type UserRole = 'artist' | 'fan' | 'brand';

/** Stored social link (validated, persisted) */
export interface SocialLink extends SocialLinkInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistProfile {
  walletAddress: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: 'artist';
  socialLinks: SocialLink[];
  createdAt: string;
  updatedAt: string;
}

export interface ArtistProfileUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: SocialLinkInput[];
}
