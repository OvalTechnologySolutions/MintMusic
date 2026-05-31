import type { ArtistProfile, ArtistProfileUpdate } from '@mintmusic/shared';
import {
  assertValidSocialLinks,
  mapSocialLinkInputs,
} from '../services/social-links.js';

const profiles = new Map<string, ArtistProfile>();

function normalizeWallet(address: string): string {
  return address.toLowerCase();
}

export function getArtistProfile(walletAddress: string): ArtistProfile | null {
  return profiles.get(normalizeWallet(walletAddress)) ?? null;
}

export function upsertArtistProfile(
  walletAddress: string,
  update: ArtistProfileUpdate
): ArtistProfile {
  const key = normalizeWallet(walletAddress);
  const now = new Date().toISOString();
  const existing = profiles.get(key);

  if (update.socialLinks) {
    assertValidSocialLinks(update.socialLinks);
  }

  const profile: ArtistProfile = {
    walletAddress: key,
    displayName:
      update.displayName?.trim() ||
      existing?.displayName ||
      `Artist ${key.slice(0, 6)}…${key.slice(-4)}`,
    bio: update.bio ?? existing?.bio,
    avatarUrl: update.avatarUrl ?? existing?.avatarUrl,
    role: 'artist',
    socialLinks: update.socialLinks
      ? mapSocialLinkInputs(update.socialLinks, existing?.socialLinks)
      : existing?.socialLinks ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  profiles.set(key, profile);
  return profile;
}
