'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMint } from '../lib/store';
import { Button } from '../ui/primitives';

function truncate(a?: string | null): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
}

/** Best-effort account link. Requires an authenticated session server-side; it
 *  no-ops gracefully otherwise, while the address is always kept locally. */
function linkServer(address: string | null): void {
  void fetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address }),
  }).catch(() => undefined);
}

/**
 * Unbranded wallet capability, surfaced quietly in Settings. No crypto/NFT
 * wording. Connects via the injected connector and remembers the address so a
 * collection can travel with the listener across apps.
 */
export function WalletCapability() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { walletAddress, setWalletAddress } = useMint();
  const [error, setError] = useState<string | null>(null);

  const shown = walletAddress ?? (isConnected ? address ?? null : null);

  const handleConnect = () => {
    setError(null);
    const connector = connectors.find((c) => c.id === 'injected') ?? connectors[0];
    if (!connector) {
      setError('No wallet available on this device.');
      return;
    }
    connect(
      { connector },
      {
        onSuccess: (res) => {
          const a = res.accounts[0] ?? null;
          setWalletAddress(a);
          linkServer(a);
        },
        onError: () => setError('Couldn’t connect. Try again from a device with a wallet.'),
      },
    );
  };

  const handleDisconnect = () => {
    disconnect();
    setWalletAddress(null);
    linkServer(null);
  };

  return (
    <div>
      {shown ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-white/85" style={{ fontFamily: 'var(--font-plex-mono), monospace' }}>
            {truncate(shown)}
          </span>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={handleConnect} disabled={isPending}>
          {isPending ? 'Connecting…' : 'Connect wallet'}
        </Button>
      )}
      <p className="mt-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Optional. Carry your collection with you across apps.
      </p>
      {error && (
        <p className="mt-2 text-[12px]" style={{ color: '#ff8a8a' }}>
          {error}
        </p>
      )}
    </div>
  );
}
