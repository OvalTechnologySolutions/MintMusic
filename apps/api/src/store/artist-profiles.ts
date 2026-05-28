import type { ArtistProfile, ArtistProfileUpdate } from '@mintmusic/shared';
import {
  validateSocialLinks,
  type SocialLinkInput,
} from '@mintmusic/shared';

const profiles = new Map<string, ArtistProfile>();

function normalizeWallet(address: string): string {
  return address.toLowerCase();
}

function newSocialLinkId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapSocialLinks(
  inputs: SocialLinkInput[],
  existing: ArtistProfile['socialLinks'] = []
): ArtistProfile['socialLinks'] {
  const now = new Date().toISOString();
  const existingByPlatform = new Map(
    existing.map((l) => [l.platform, l])
  );

  return inputs.map((input) => {
    const prev = existingByPlatform.get(input.platform);
    return {
      id: prev?.id ?? newSocialLinkId(),
      platform: input.platform,
      url: input.url.trim().startsWith('http')
        ? input.url.trim()
        : `https://${input.url.trim()}`,
      label: input.label,
      isPrimary: input.isPrimary ?? false,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
  });
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
    const validation = validateSocialLinks(update.socialLinks);
    if (!validation.valid) {
      throw new Error(validation.errors.join('; '));
    }
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
      ? mapSocialLinks(update.socialLinks, existing?.socialLinks)
      : existing?.socialLinks ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  profiles.set(key, profile);
  return profile;
}
