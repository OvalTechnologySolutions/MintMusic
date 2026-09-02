'use client';

import { useEffect, useState } from 'react';
import type { StripeConnectStatusResponse } from '@mintmusic/shared';

export default function PaymentsSettings() {
  const [status, setStatus] = useState<StripeConnectStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = () => {
    setLoading(true);
    fetch('/api/stripe/connect/status')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStatus(d);
      })
      .catch(() => setError('Failed to load status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stripe/connect/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setStatus(d);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load status');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startOnboarding = async () => {
    setError(null);
    const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not start onboarding');
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Stripe payouts</h2>
        <p className="text-gray-400 text-sm">
          Link your bank account via Stripe Connect to accept payments, donations,
          and release sales. MintMusic uses Stripe for secure payouts to creators.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Connected</dt>
            <dd>{status?.connected ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Accept payments</dt>
            <dd>{status?.chargesEnabled ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Payouts enabled</dt>
            <dd>{status?.payoutsEnabled ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Onboarding complete</dt>
            <dd>{status?.onboardingComplete ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={startOnboarding}
        className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-6 rounded-xl"
      >
        {status?.connected ? 'Update bank & payout details' : 'Connect bank with Stripe'}
      </button>

      <button
        type="button"
        onClick={loadStatus}
        className="block text-sm text-gray-400 hover:text-white"
      >
        Refresh status
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
