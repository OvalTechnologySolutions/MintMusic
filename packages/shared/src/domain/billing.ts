/** Shared Mint billing constants — keep in sync with apps/api/src/config/billing.ts */

export const ARTIST_SUBSCRIPTION_PRICE_CENTS = 999;
export const ARTIST_INTRO_MONTHS = 12;
export const MINT_UNITS_PER_DOLLAR = 100;
export const SONG_SAVE_UNITS = 25;
export const MINT_TOPUP_MIN_CENTS = 500;
export const MINT_TOPUP_SUGGESTED_CENTS = [500, 1000, 2500] as const;

export type WalletLedgerType =
  | 'purchase'
  | 'song_save'
  | 'refund'
  | 'reversal'
  | 'adjustment';

export type MintTopUpStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'expired';

export type ArtistSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused';

export interface WalletBalanceResponse {
  balanceUnits: number;
  balanceMint: number;
  balanceUsdCents: number;
  songSaveUnits: number;
  hasBlockingDeficit: boolean;
  deficitUnits: number;
}

export interface WalletTransactionItem {
  id: string;
  type: WalletLedgerType;
  amountUnits: number;
  balanceAfterUnits: number;
  status: string;
  trackId?: string;
  reason?: string;
  createdAt: string;
}

export interface CreateMintCheckoutRequest {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateMintCheckoutResponse {
  url: string;
  sessionId: string;
  orderId: string;
  amountCents: number;
  mintUnits: number;
  mintDisplay: number;
  savesEstimate: number;
}

export interface SaveSongRequest {
  trackId: string;
  idempotencyKey: string;
}

export interface SaveSongResponse {
  charged: boolean;
  amountUnits: number;
  balanceUnits: number;
  entitlementId: string;
  libraryItemId: string;
  alreadyOwned: boolean;
}

export interface LibraryTrackItem {
  trackId: string;
  releaseId: string;
  title: string;
  releaseTitle: string;
  creatorName: string;
  coverUrl?: string;
  durationMs?: number;
  entitled: boolean;
  visible: boolean;
  source: string;
  addedAt: string;
}

export interface ArtistSubscriptionStatusResponse {
  hasSubscription: boolean;
  status?: ArtistSubscriptionStatus;
  trialEnd?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  renewalAuthorized: boolean;
  introOfferEligible: boolean;
  introOfferRedeemed: boolean;
  introEndsAt?: string;
  priceCents: number;
  accessActive: boolean;
  needsPaymentMethod: boolean;
  message?: string;
}

export interface ActivateIntroOfferResponse {
  subscription: ArtistSubscriptionStatusResponse;
}

export interface OfflineLeaseResponse {
  leaseToken: string;
  expiresAt: string;
  leaseSeconds: number;
}

export interface BillingConfigResponse {
  artistPriceCents: number;
  artistIntroMonths: number;
  mintUnitsPerDollar: number;
  songSaveUnits: number;
  mintTopUpMinCents: number;
  mintTopUpSuggestedCents: number[];
  mintTopUpMaxCents: number;
  offlineLeaseSeconds: number;
}
