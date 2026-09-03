import Image from 'next/image';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import MintMusicABI from '../../abis/MintMusic.json';
import { getContractAddress } from '@/lib/contracts';

interface AlbumProps {
  id: number;
  title: string;
  artist: string;
  price: string;
  coverUrl: string;
  maxSupply: number;
  currentSupply: number;
}

export default function AlbumCard({ album }: { album: AlbumProps }) {
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const isSoldOut = album.maxSupply > 0 && album.currentSupply >= album.maxSupply;
  const isOwned = album.price === "Owned";
  
  const purchase = async () => {
    if (isOwned || isSoldOut) return;
    const address = getContractAddress();
    if (!address) return;

    writeContract({
      address,
      abi: MintMusicABI.abi,
      functionName: 'purchase',
      args: [BigInt(album.id), 1n],
      value: parseEther(album.price),
    });
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-gray-600 transition-all duration-300 group hover:shadow-xl hover:shadow-green-500/5">
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image 
          src={album.coverUrl} 
          alt={album.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 hidden items-end justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent pb-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
          {!isOwned && (
            <button 
              onClick={purchase}
              disabled={isConfirming || isSoldOut}
              className="native-store-purchase bg-green-500 hover:bg-green-400 text-black text-sm font-bold px-6 py-2.5 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Buying...
                </span>
              ) : isSoldOut ? 'Sold Out' : `Collect for ${album.price} ETH`}
            </button>
          )}
        </div>
        
        {/* Supply Badge */}
        {album.maxSupply > 0 && (
          <div className="absolute top-3 right-3 glass px-3 py-1.5 rounded-full text-xs font-medium">
            <span className={isSoldOut ? 'text-red-400' : 'text-white'}>
              {album.currentSupply}/{album.maxSupply}
            </span>
          </div>
        )}
        
        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-wider uppercase">Sold Out</span>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="p-4">
        <h3 className="font-bold text-white truncate group-hover:text-green-400 transition-colors">{album.title}</h3>
        <p className="text-gray-400 text-sm truncate">{album.artist}</p>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
          {isOwned ? (
            <span className="text-green-400 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Owned
            </span>
          ) : (
            <span className="text-green-400 font-mono text-sm">{album.price} ETH</span>
          )}
          <span className="text-gray-500 text-xs">#{album.id}</span>
        </div>
        {!isOwned && (
          <button
            onClick={purchase}
            disabled={isConfirming || isSoldOut}
            className="native-store-purchase mt-4 min-h-11 w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
          >
            {isConfirming ? 'Confirming…' : isSoldOut ? 'Sold out' : `Collect for ${album.price} ETH`}
          </button>
        )}
        
        {/* Transaction Feedback */}
        {error && (
          <p className="text-red-400 text-xs mt-2 truncate">
            {error.message.slice(0, 40)}...
          </p>
        )}
        {isSuccess && (
          <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Successfully collected!
          </p>
        )}
      </div>
    </div>
  );
}
