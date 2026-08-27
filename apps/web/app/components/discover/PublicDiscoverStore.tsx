'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { DiscoverStoreResponse } from '@mintmusic/shared';

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PublicDiscoverStore() {
  const [store, setStore] = useState<DiscoverStoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadStore = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await fetch(`/api/discover/store/public${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load releases');
      setStore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="search"
          placeholder="Search releases…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadStore(query)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
        <button
          type="button"
          onClick={() => loadStore(query)}
          className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-gray-400">Loading releases…</p>}
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && store && store.releases.length === 0 && (
        <p className="text-gray-500">No releases yet. Check back soon.</p>
      )}

      {store && store.releases.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {store.releases.map((release) => (
            <article
              key={release.id}
              className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden hover:border-green-500/50 transition-colors"
            >
              <div className="aspect-square bg-gray-800 relative">
                {release.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={release.coverUrl}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold truncate">{release.title}</h3>
                <p className="text-gray-400 text-sm truncate">{release.creatorName}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-green-400 font-semibold">
                    {formatPrice(release.priceCents)}
                  </span>
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent('/collector')}`}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-600 hover:border-green-500 transition-colors"
                  >
                    Sign in to collect
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
