'use client';

import { useCallback, useEffect, useState } from 'react';
import RecordCarousel, { type RecordCarouselItem } from './RecordCarousel';

export default function MyCollection() {
  const [items, setItems] = useState<RecordCarouselItem[]>([]);
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
    <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/50 p-4 sm:p-6">
      <h2 className="text-xl font-semibold">My Collection</h2>
      <p className="mb-4 text-sm text-gray-400">
        The records you chose, ready whenever you are.
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
        <RecordCarousel items={items} />
      )}
    </section>
  );
}
