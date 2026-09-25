'use client';

import { useEffect, useState } from 'react';
import type { ArtistSubscriptionStatusResponse } from '@mintmusic/shared';
import {
  activateIntroOffer,
  authorizeArtistRenewal,
  cancelArtistSubscription,
  fetchArtistSubscription,
  openBillingPortal,
} from '../lib/billing-api';
import { Button } from '../ui/primitives';

export function ArtistSubscriptionPanel() {
  const [status, setStatus] = useState<ArtistSubscriptionStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    fetchArtistSubscription()
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));

  useEffect(() => {
    void reload();
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {error ?? 'Loading subscription…'}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <h3 className="text-[15px] font-semibold">Artist subscription</h3>
      <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
        ${(status.priceCents / 100).toFixed(2)}/month after your introductory period. Listener Mint
        balance is never charged for this subscription.
      </p>
      {status.message && (
        <p className="text-[13px]" style={{ color: 'var(--mint-primary)' }}>
          {status.message}
        </p>
      )}
      {status.introEndsAt && (
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Free period ends {status.introEndsAt.slice(0, 10)}
          {status.cancelAtPeriodEnd ? ' · renewal canceled (access through that date)' : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {status.introOfferEligible && (
          <Button disabled={busy} onClick={() => void run(() => activateIntroOffer())}>
            Start 12 months free
          </Button>
        )}
        {status.hasSubscription && !status.renewalAuthorized && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const portal = await openBillingPortal();
                window.location.href = portal.url;
              })
            }
          >
            Add payment method
          </Button>
        )}
        {status.hasSubscription && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => authorizeArtistRenewal())}
          >
            Authorize $9.99 renewal
          </Button>
        )}
        {status.hasSubscription && !status.cancelAtPeriodEnd && status.accessActive && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => cancelArtistSubscription())}
          >
            Cancel renewal
          </Button>
        )}
        {status.hasSubscription && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const portal = await openBillingPortal();
                window.location.href = portal.url;
              })
            }
          >
            Manage billing
          </Button>
        )}
      </div>
      {error && (
        <p className="text-[13px]" style={{ color: '#F07178' }} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
