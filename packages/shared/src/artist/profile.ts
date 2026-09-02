import type { SocialLink, SocialLinkInput } from '../social/link.js';

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
