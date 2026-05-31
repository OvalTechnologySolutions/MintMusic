'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import MintMusicABI from '@/abis/MintMusic.json';
import ArtistProfilePanel from '../profile/ArtistProfilePanel';
import { getContractAddress } from '@/lib/contracts';
import Link from 'next/link';

export default function CreatorStudio() {
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [supply, setSupply] = useState('');
  const [price, setPrice] = useState('');
  const [uri, setUri] = useState('');
  const [title, setTitle] = useState('');
  const contractAddress = getContractAddress();

  const createRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supply || !price || !uri || !contractAddress) return;

    writeContract({
      address: contractAddress,
      abi: MintMusicABI.abi,
      functionName: 'createRelease',
      args: [BigInt(supply), parseEther(price), uri, 1000n],
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex flex-wrap gap-4 justify-between items-center">
        <p className="text-sm text-gray-400">
          Accept card payments & donations via Stripe in{' '}
          <Link href="/settings?tab=payments" className="text-green-400 hover:underline">
            Settings → Payments
          </Link>
        </p>
        <Link
          href="/settings?tab=wallet"
          className="text-sm text-gray-400 hover:text-white"
        >
          Link wallet for on-chain mints →
        </Link>
      </div>

      <ArtistProfilePanel />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Total Releases</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Stripe revenue</p>
          <p className="text-3xl font-bold text-green-400">—</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Collectors</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">On-chain sales</p>
          <p className="text-3xl font-bold text-purple-400">0 ETH</p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
        <h2 className="text-2xl font-bold mb-6">Create New Release</h2>
        <form onSubmit={createRelease} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Release Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl"
                  placeholder="Track or album name"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Metadata URI (IPFS)</label>
                <input
                  type="text"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl"
                  placeholder="ipfs://..."
                />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Max Supply</label>
                <input
                  type="number"
                  value={supply}
                  onChange={(e) => setSupply(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Price (ETH)</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl"
                />
              </div>
            </div>
          </div>
          <button
            disabled={isConfirming || !uri || !supply || !price}
            type="submit"
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl disabled:opacity-50"
          >
            {isConfirming ? 'Minting…' : 'Mint Release'}
          </button>
          {error && <p className="text-red-400 text-sm">{error.message}</p>}
          {isSuccess && <p className="text-green-400 text-sm">Release created.</p>}
        </form>
      </div>
    </div>
  );
}
