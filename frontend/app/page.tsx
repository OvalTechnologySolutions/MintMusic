'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import MintMusicABI from '../abis/MintMusic.json';
import FanView from './components/FanView';
import LandingPage from './components/LandingPage';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Localhost default deploy address

export default function Home() {
  const [showApp, setShowApp] = useState(false);
  const [role, setRole] = useState<'artist' | 'fan'>('fan');

  if (!showApp) {
    return <LandingPage onEnterApp={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => setShowApp(false)}
            className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            MintMusic
          </button>
          <div className="flex items-center gap-6">
            {/* Role Toggle */}
            <div className="flex bg-gray-800 rounded-full p-1">
              <button
                onClick={() => setRole('fan')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  role === 'fan' 
                    ? 'bg-green-500 text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Collector
              </button>
              <button
                onClick={() => setRole('artist')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  role === 'artist' 
                    ? 'bg-green-500 text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Creator
              </button>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {role === 'artist' ? <ArtistView /> : <FanView />}
        </div>
      </main>
    </div>
  );
}

function ArtistView() {
  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [supply, setSupply] = useState('');
  const [price, setPrice] = useState('');
  const [uri, setUri] = useState('');
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      setFileName(e.target.files[0].name);
      // Simulate IPFS upload
      console.log("Uploading file to IPFS...", e.target.files[0].name);
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In a real app, use Pinata or IPFS API here
      setUri("ipfs://QmMockHash1234567890"); 
      setIsUploading(false);
    }
  };

  const createRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supply || !price || !uri) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MintMusicABI.abi,
      functionName: 'createRelease',
      args: [BigInt(supply), parseEther(price), uri, 1000n], // 10% royalty default
    });
  };

  return (
    <div className="max-w-4xl">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Total Releases</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-400">0 ETH</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Collectors</p>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-1">Secondary Sales</p>
          <p className="text-3xl font-bold text-purple-400">0 ETH</p>
        </div>
      </div>

      {/* Create Release Form */}
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Create New Release</h2>
        </div>
        
        <form onSubmit={createRelease} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Release Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Enter track or album name"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Audio File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="bg-gray-900 border border-dashed border-gray-600 p-6 rounded-xl text-center hover:border-green-500 transition-colors">
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-yellow-400 text-sm">Uploading to IPFS...</p>
                      </div>
                    ) : fileName ? (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-green-400 text-sm">{fileName}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-400 text-sm">Click to upload audio file</p>
                        <p className="text-gray-500 text-xs mt-1">MP3, WAV, FLAC supported</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Max Supply</label>
                <input
                  type="number"
                  value={supply}
                  onChange={(e) => setSupply(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g. 100"
                />
                <p className="text-gray-500 text-xs mt-2">Create scarcity by limiting copies</p>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Price (ETH)</label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 p-4 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g. 0.01"
                />
                <p className="text-gray-500 text-xs mt-2">You receive 100% of primary sales</p>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Royalty Rate</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="25"
                    defaultValue="10"
                    className="w-full accent-green-500"
                  />
                  <span className="text-green-400 font-bold min-w-[50px]">10%</span>
                </div>
                <p className="text-gray-500 text-xs mt-2">Earn on every resale forever</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <button
              disabled={isConfirming || !uri || !supply || !price}
              type="submit"
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Minting...
                </span>
              ) : (
                'Mint Release'
              )}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
              Error: {error.message}
            </div>
          )}
          {isSuccess && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Release Created! Transaction Confirmed.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
