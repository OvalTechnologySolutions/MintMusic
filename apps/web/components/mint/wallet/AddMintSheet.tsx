'use client';

import { useEffect, useState } from 'react';
import {
  MINT_TOPUP_SUGGESTED_CENTS,
  formatMint,
  previewMintTopUp,
  startMintCheckout,
} from '../lib/billing-api';
import { Button, Sheet } from '../ui/primitives';

export function AddMintSheet({
  open,
  onClose,
  pendingTrackTitle,
}: {
  open: boolean;
  onClose: () => void;
  pendingTrackTitle?: string;
}) {
  const [custom, setCustom] = useState('5');
  const [preview, setPreview] = useState<{
    mintDisplay: number;
    savesEstimate: number;
    amountCents: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const cents = Math.round(Number(custom) * 100);
    if (!Number.isFinite(cents) || cents < 500) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    previewMintTopUp(cents)
      .then((p) => {
        if (!cancelled) {
          setPreview({
            mintDisplay: p.mintDisplay,
            savesEstimate: p.savesEstimate,
            amountCents: p.amountCents,
          });
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(err instanceof Error ? err.message : 'Invalid amount');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [custom, open]);

  const checkout = async (amountCents: number) => {
    setBusy(true);
    setError(null);
    try {
      const session = await startMintCheckout(amountCents);
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add Mint">
      <div className="flex flex-col gap-4 px-1 pb-6">
        <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
          1 Mint = $1 USD. Mint is closed-loop credit for song saves on MintMusic.
          {pendingTrackTitle
            ? ` After funding you can return to save “${pendingTrackTitle}”.`
            : ''}
        </p>

        <div className="flex flex-col gap-2">
          {MINT_TOPUP_SUGGESTED_CENTS.map((cents) => (
            <button
              key={cents}
              disabled={busy}
              onClick={() => void checkout(cents)}
              className="mint-focus flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-left text-[15px]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span>${(cents / 100).toFixed(0)}</span>
              <span style={{ color: 'var(--mint-primary)' }}>
                {formatMint(cents)} Mint · ~{Math.floor(cents / 25)} saves
              </span>
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Custom amount (USD, min $5)
          <input
            type="number"
            min={5}
            step={0.01}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="mint-focus rounded-xl px-3 py-3 text-[15px] text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </label>

        {preview && (
          <p className="text-[14px]" style={{ color: 'var(--mint-primary)' }}>
            You will receive {preview.mintDisplay} Mint (${(preview.amountCents / 100).toFixed(2)}{' '}
            credit) — about {preview.savesEstimate} song saves. Applicable tax is disclosed at
            checkout and is not deducted from Mint.
          </p>
        )}

        {error && (
          <p className="text-[13px]" style={{ color: '#F07178' }} role="alert">
            {error}
          </p>
        )}

        <Button
          full
          disabled={busy || !preview}
          onClick={() => preview && void checkout(preview.amountCents)}
        >
          {busy ? 'Redirecting…' : 'Continue to checkout'}
        </Button>
      </div>
    </Sheet>
  );
}
