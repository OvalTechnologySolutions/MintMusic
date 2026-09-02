import type { SocialPlatform } from './platforms';

/** How the link was established — manual URL today; OAuth when platform APIs are wired */
export type SocialLinkConnectionType = 'manual' | 'oauth';

export interface SocialLinkInput {
  platform: SocialPlatform;
  url: string;
  label?: string;
  isPrimary?: boolean;
}

export interface SocialLink extends SocialLinkInput {
  id: string;
  connectionType: SocialLinkConnectionType;
  /** Set when connectionType is oauth (platform account id) */
  externalAccountId?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSocialLinksRequest {
  socialLinks: SocialLinkInput[];
}

export interface PublicUserProfile {
  id: string;
  name: string;
  image?: string;
  role: 'collector' | 'creator';
  socialLinks: SocialLink[];
}
