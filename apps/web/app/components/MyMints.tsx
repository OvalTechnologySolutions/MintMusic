import { useAccount, useReadContracts, useReadContract } from 'wagmi';
import MintMusicABI from '../../abis/MintMusic.json';
import AlbumCard from './AlbumCard';
import { useEffect, useState } from 'react';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// We need to fetch metadata for the tokens. In a real app, this comes from IPFS/Backend.
// For the demo, we will match the IDs with our Mock Data or fetch URI if possible.
const MOCK_METADATA: Record<string, any> = {
  "1": { title: "Midnight Haze", artist: "Neon Pulse", coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&h=600&fit=crop" },
  "2": { title: "Digital Dreams", artist: "Cyber Soul", coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop" },
  "3": { title: "Cosmic Drift", artist: "Luna Ray", coverUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=600&fit=crop" },
  "4": { title: "Underground", artist: "Techno Bunker", coverUrl: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=600&h=600&fit=crop" },
};

export default function MyMints() {
  const { address } = useAccount();
  const [ownedTokens, setOwnedTokens] = useState<any[]>([]);

  // 1. Get total supply to know how many to check
  const { data: currentTokenId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MintMusicABI.abi,
    functionName: 'currentTokenId',
  });

  // Prepare contract calls for all IDs
  // Note: hooks must be stable, so we can't dynamic this easily in standard wagmi without a loop component or ensuring array length.
  // For this demo, we'll check the first 20 IDs.
  const potentialIds = Array.from({ length: 20 }, (_, i) => BigInt(i + 1));
  
  const { data: balances } = useReadContracts({
    contracts: potentialIds.map(id => ({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: MintMusicABI.abi as any,
      functionName: 'balanceOf',
      args: [address, id],
    })),
    query: {
      enabled: !!address,
    }
  });

  useEffect(() => {
    if (!balances || !address) return;

    const owned = balances
      .map((result, index) => {
        const id = index + 1;
        const balance = result.result as bigint; // balanceOf returns uint256 which is bigint
        if (balance && balance > 0n) {
          const meta = MOCK_METADATA[id.toString()] || { 
            title: `Release #${id}`, 
            artist: "Unknown Artist", 
            coverUrl: "https://placehold.co/400x400/333/fff?text=No+Metadata" 
          };
          
          return {
            id: id,
            ...meta,
            price: "Owned", // Display logic for owned items
            maxSupply: 0, // Not needed for owned view necessarily
            currentSupply: 0,
            balance: balance.toString()
          };
        }
        return null;
      })
      .filter(item => item !== null);

    setOwnedTokens(owned);
  }, [balances, address]);

  if (!address) {
    return <div className="text-center text-gray-400 py-12">Connect your wallet to view your collection.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">My Collection</h2>
      {ownedTokens.length === 0 ? (
        <div className="text-gray-400">You haven't collected any music yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {ownedTokens.map((token) => (
            <div key={token.id} className="relative group">
               {/* Reuse AlbumCard styles but stripped down or modify AlbumCard to handle "owned" state better */}
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
