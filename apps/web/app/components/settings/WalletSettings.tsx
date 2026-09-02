'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export default function WalletSettings() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((d) => setLinkedAddress(d.user?.walletAddress ?? null))
      .catch(() => {});
  }, []);

  const saveWallet = async () => {
    if (!address) return;
    setError(null);
    setSaved(false);
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to save');
      return;
    }
    setLinkedAddress(data.user.walletAddress);
    setSaved(true);
  };

  const unlinkWallet = async () => {
    setError(null);
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: null }),
    });
    if (res.ok) {
      setLinkedAddress(null);
      disconnect();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Wallet connection</h2>
        <p className="text-gray-400 text-sm">
          Connect a wallet for on-chain collects and releases. This is separate from
          your OAuth sign-in and is only used for blockchain features.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ConnectButton />
        {isConnected && (
          <button
            type="button"
            onClick={saveWallet}
            className="bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-5 rounded-full text-sm"
          >
            Save to profile
          </button>
        )}
      </div>

      {linkedAddress && (
        <p className="text-sm text-gray-400">
          Linked wallet:{' '}
          <span className="text-green-400 font-mono">{linkedAddress}</span>
        </p>
      )}

      {linkedAddress && (
        <button
          type="button"
          onClick={unlinkWallet}
          className="text-sm text-red-400 hover:underline"
        >
          Unlink wallet
        </button>
      )}

      {saved && (
        <p className="text-green-400 text-sm">Wallet saved to your profile.</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
