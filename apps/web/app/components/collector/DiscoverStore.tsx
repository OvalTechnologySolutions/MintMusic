'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DiscoverStoreResponse } from '@mintmusic/shared';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DiscoverStore() {
  const [store, setStore] = useState<DiscoverStoreResponse | null>(null);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadStore = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/discover/store${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load store');
      setStore(data);

      const ownership: Record<string, boolean> = {};
      await Promise.all(
        data.releases.map(async (r: { id: string }) => {
          const check = await fetch(`/api/collection/check/${r.id}`);
          const checkData = await check.json();
          if (check.ok) ownership[r.id] = Boolean(checkData.owned);
        })
      );
      setOwned(ownership);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  async function handleBuy(releaseId: string) {
    setBuyingId(releaseId);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch('/api/stripe/checkout/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId,
          successUrl: `${origin}/collector?purchased=${releaseId}`,
          cancelUrl: `${origin}/collector?cancelled=1`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBuyingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Digital Store</h2>
          <p className="text-sm text-gray-400">
            Browse releases and purchase digital copies via Stripe.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            loadStore(query);
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search albums..."
            className="rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Loading store...</p>
      ) : !store?.releases.length ? (
        <p className="text-gray-400">No published releases yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {store.releases.map((release) => {
            const isOwned = owned[release.id];
            return (
              <article
                key={release.id}
                className="rounded-lg border border-gray-700 bg-gray-900/60 p-4"
              >
                {release.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={release.coverUrl}
                    alt=""
                    className="mb-3 h-40 w-full rounded object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-40 items-center justify-center rounded bg-gray-800 text-gray-500">
                    No cover
                  </div>
                )}
                <h3 className="font-medium">{release.title}</h3>
                <p className="text-sm text-gray-400">
                  {release.creatorName} · {release.type}
                </p>
                <p className="mt-2 text-lg font-semibold text-purple-300">
                  {formatPrice(release.priceCents)}
                </p>
                {isOwned ? (
                  <span className="mt-3 inline-block rounded bg-green-900/50 px-3 py-1 text-sm text-green-300">
                    Owned
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={buyingId === release.id}
                    onClick={() => handleBuy(release.id)}
                    className="mt-3 w-full rounded-lg bg-purple-600 py-2 text-sm font-medium hover:bg-purple-500 disabled:opacity-50"
                  >
                    {buyingId === release.id ? 'Redirecting…' : 'Buy release'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
