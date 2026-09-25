'use client';

import { useEffect, useState } from 'react';
import { fetchWalletTransactions, formatMint } from '../lib/billing-api';
import type { WalletTransactionItem } from '@mintmusic/shared';
import { Sheet } from '../ui/primitives';

export function WalletHistorySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<WalletTransactionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchWalletTransactions()
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Mint activity">
      <div className="flex flex-col gap-3 px-1 pb-6">
        {error && (
          <p className="text-[13px]" style={{ color: '#F07178' }}>
            {error}
          </p>
        )}
        {!error && items.length === 0 && (
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            No wallet activity yet.
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-[14px]"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div>
              <div className="capitalize">{item.type.replace('_', ' ')}</div>
              <div className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
            <div
              style={{
                color: item.amountUnits >= 0 ? 'var(--mint-primary)' : 'rgba(255,255,255,0.85)',
              }}
            >
              {item.amountUnits >= 0 ? '+' : ''}
              {formatMint(item.amountUnits)} Mint
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
