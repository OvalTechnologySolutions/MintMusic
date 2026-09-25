'use client';

import type {
  ArtistSubscriptionStatusResponse,
  BillingConfigResponse,
  CreateMintCheckoutResponse,
  LibraryTrackItem,
  OfflineLeaseResponse,
  SaveSongResponse,
  WalletBalanceResponse,
  WalletTransactionItem,
} from '@mintmusic/shared';
import {
  MINT_TOPUP_SUGGESTED_CENTS,
  SONG_SAVE_UNITS,
} from '@mintmusic/shared';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string }).error ?? res.statusText
    ) as Error & { status?: number; code?: string };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export { MINT_TOPUP_SUGGESTED_CENTS, SONG_SAVE_UNITS };

export function fetchWallet() {
  return jsonFetch<WalletBalanceResponse>('/api/wallet');
}

export function fetchWalletTransactions() {
  return jsonFetch<{ items: WalletTransactionItem[] }>(
    '/api/wallet/transactions'
  );
}

export function fetchBillingConfig() {
  return jsonFetch<BillingConfigResponse>('/api/mint/config');
}

export function previewMintTopUp(amountCents: number) {
  return jsonFetch<{
    amountCents: number;
    mintUnits: number;
    mintDisplay: number;
    savesEstimate: number;
  }>('/api/mint/preview', {
    method: 'POST',
    body: JSON.stringify({ amountCents }),
  });
}

export function startMintCheckout(amountCents: number) {
  const origin = window.location.origin;
  return jsonFetch<CreateMintCheckoutResponse>('/api/mint/checkout', {
    method: 'POST',
    body: JSON.stringify({
      amountCents,
      successUrl: `${origin}/?mint=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/?mint=canceled`,
    }),
  });
}

export function saveSong(trackId: string, idempotencyKey: string) {
  return jsonFetch<SaveSongResponse>('/api/library/save', {
    method: 'POST',
    body: JSON.stringify({ trackId, idempotencyKey }),
  });
}

export function fetchLibrary() {
  return jsonFetch<{ items: LibraryTrackItem[] }>('/api/library');
}

export function hideLibraryTrack(trackId: string) {
  return jsonFetch<{ ok: boolean }>(`/api/library/${encodeURIComponent(trackId)}`, {
    method: 'DELETE',
  });
}

export function restoreLibraryTrack(trackId: string) {
  return jsonFetch<{ id: string; visible: boolean }>(
    `/api/library/${encodeURIComponent(trackId)}`,
    { method: 'POST' }
  );
}

export function fetchArtistSubscription() {
  return jsonFetch<ArtistSubscriptionStatusResponse>('/api/artist/subscription');
}

export function activateIntroOffer() {
  return jsonFetch<{ subscription: ArtistSubscriptionStatusResponse }>(
    '/api/artist/subscription/activate-intro',
    { method: 'POST' }
  );
}

export function authorizeArtistRenewal() {
  return jsonFetch<{ subscription: ArtistSubscriptionStatusResponse }>(
    '/api/artist/subscription/authorize-renewal',
    { method: 'POST' }
  );
}

export function cancelArtistSubscription() {
  return jsonFetch<{ subscription: ArtistSubscriptionStatusResponse }>(
    '/api/artist/subscription/cancel',
    { method: 'POST' }
  );
}

export function openBillingPortal() {
  return jsonFetch<{ url: string }>('/api/artist/subscription/portal', {
    method: 'POST',
    body: JSON.stringify({ returnUrl: window.location.href }),
  });
}

export function createOfflineLease(deviceId: string) {
  return jsonFetch<OfflineLeaseResponse>('/api/offline/lease', {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  });
}

export function revokeOfflineLeases() {
  return jsonFetch<{ ok: boolean }>('/api/offline/revoke', { method: 'POST' });
}

export function formatMint(units: number): string {
  return (units / 100).toFixed(2);
}
