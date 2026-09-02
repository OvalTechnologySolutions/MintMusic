import type { SocialLink, SocialLinkInput } from '../social/link.js';

export type UserRole = 'collector' | 'creator';

export type CreatorStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  creatorStatus: CreatorStatus;
  walletAddress?: string;
  socialLinks: SocialLink[];
  stripeConnectAccountId?: string;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthSyncRequest {
  email: string;
  name: string;
  image?: string;
  provider: string;
  providerAccountId: string;
}

export interface OAuthSyncResponse {
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  walletAddress?: string | null;
  socialLinks?: SocialLinkInput[];
}

export interface CreatorApplication {
  id: string;
  userId: string;
  artistName: string;
  genre: string;
  bio: string;
  portfolioUrl?: string;
  whyJoin: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
}

export interface SubmitCreatorApplicationRequest {
  artistName: string;
  genre: string;
  bio: string;
  portfolioUrl?: string;
  whyJoin: string;
}

export interface StripeConnectStatusResponse {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
}

export interface CreateDonationCheckoutRequest {
  creatorUserId: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResponse {
  url: string;
  sessionId: string;
}

export interface CreateReleaseCheckoutRequest {
  releaseId: string;
  successUrl: string;
  cancelUrl: string;
}
