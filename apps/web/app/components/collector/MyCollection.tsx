'use client';

import { useCallback, useEffect, useState } from 'react';

interface CollectionItem {
  releaseId: string;
  title: string;
  type: string;
  coverUrl?: string;
  creatorName: string;
  purchasedAt: string;
  tracks?: Array<{ id: string; title: string; trackNumber: number }>;
}

export default function MyCollection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/collection');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load collection');
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchased')) {
      load();
    }
  }, [load]);

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
      <h2 className="text-xl font-semibold">My Collection</h2>
      <p className="mb-4 text-sm text-gray-400">
        Digital releases you own. Secure playback via DRM when configured.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-400">Loading collection...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400">
          No purchases yet. Browse the store to buy your first release.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.releaseId}
              className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-900/60 p-3"
            >
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverUrl}
                  alt=""
                  className="h-14 w-14 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded bg-gray-800 text-xs text-gray-500">
                  Art
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-sm text-gray-400">
                  {item.creatorName} · {item.type}
                </p>
                {item.tracks && item.tracks.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {item.tracks.length} track{item.tracks.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              <time className="text-xs text-gray-500">
                {new Date(item.purchasedAt).toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
