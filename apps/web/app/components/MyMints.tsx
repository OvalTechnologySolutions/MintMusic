'use client';

import { useAccount, useReadContracts } from 'wagmi';
import MintMusicABI from '../../abis/MintMusic.json';
import AlbumCard from './AlbumCard';
import { useEffect, useState } from 'react';
import { getContractAddress } from '@/lib/contracts';

export default function MyMints() {
  const { address } = useAccount();
  const [ownedTokens, setOwnedTokens] = useState<
    Array<{
      id: number;
      title: string;
      artist: string;
      coverUrl: string;
      price: string;
      maxSupply: number;
      currentSupply: number;
      balance: string;
    }>
  >([]);

  const contractAddress = getContractAddress();
  const potentialIds = Array.from({ length: 20 }, (_, i) => BigInt(i + 1));

  const { data: balances } = useReadContracts({
    contracts: potentialIds.map((id) => ({
      address: contractAddress as `0x${string}`,
      abi: MintMusicABI.abi as never,
      functionName: 'balanceOf',
      args: [address!, id],
    })),
    query: {
      enabled: !!address && !!contractAddress,
    },
  });

  useEffect(() => {
    if (!balances || !address) return;

    const owned = balances
      .map((result, index) => {
        const id = index + 1;
        const balance = result.result as bigint | undefined;
        if (balance && balance > 0n) {
          return {
            id,
            title: `Release #${id}`,
            artist: 'On-chain',
            coverUrl:
              'https://placehold.co/400x400/1a1a2e/9ca3af?text=Release+' + id,
            price: 'Owned',
            maxSupply: 0,
            currentSupply: 0,
            balance: balance.toString(),
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    setOwnedTokens(owned);
  }, [balances, address]);

  if (!address) {
    return (
      <div className="text-center text-gray-400 py-12">
        Connect your wallet to view your collection.
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="text-center text-gray-400 py-12">
        Set NEXT_PUBLIC_CONTRACT_ADDRESS to load on-chain collections.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ownedTokens.length === 0 ? (
        <div className="text-gray-400">You haven&apos;t collected any music yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {ownedTokens.map((token) => (
            <div key={token.id} className="relative group">
              <AlbumCard album={token} />
              <div className="absolute top-2 left-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">
                x{token.balance}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
