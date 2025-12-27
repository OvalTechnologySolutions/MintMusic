import { useState } from 'react';
import AlbumCard from './AlbumCard';
import ArtistList from './ArtistList';
import MyMints from './MyMints';

// Mock Data
const MOCK_RELEASES = [
  { id: 1, artist: "Neon Pulse", title: "Midnight Haze", coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&h=600&fit=crop", price: "0.01", maxSupply: 100, currentSupply: 45 },
  { id: 2, artist: "Cyber Soul", title: "Digital Dreams", coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop", price: "0.05", maxSupply: 50, currentSupply: 12 },
  { id: 3, artist: "Luna Ray", title: "Cosmic Drift", coverUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&h=600&fit=crop", price: "0.005", maxSupply: 500, currentSupply: 120 },
  { id: 4, artist: "Techno Bunker", title: "Underground", coverUrl: "https://images.unsplash.com/photo-1571974599782-87624638275e?w=600&h=600&fit=crop", price: "0.02", maxSupply: 200, currentSupply: 199 },
];

export default function FanView() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'mymints'>('marketplace');

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`pb-4 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'marketplace' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('mymints')}
          className={`pb-4 px-6 text-sm font-bold transition-colors border-b-2 ${activeTab === 'mymints' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          My Mints
        </button>
      </div>

      {activeTab === 'marketplace' ? (
        <div className="space-y-12 animate-fade-in">
          {/* Featured Section */}
          <div className="relative h-80 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-green-900 flex items-center p-12 shadow-2xl border border-gray-700/30">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=600&fit=crop')] opacity-20 bg-cover bg-center"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent"></div>
            
            <div className="z-10 max-w-lg">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-green-400 uppercase tracking-widest bg-green-500/10 border border-green-500/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Featured Drop
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-white mt-4 mb-4 leading-tight">The Future of <br/><span className="gradient-text">Sound is Here</span></h1>
              <p className="text-gray-300 mb-8 text-lg font-light leading-relaxed">Exclusive limited edition releases from top Web3 artists. Collect now to unlock backstage access and exclusive rewards.</p>
              <button className="bg-white text-black font-bold py-3 px-8 rounded-full hover:bg-green-400 transition-all transform hover:scale-105 shadow-lg">
                Explore Collection
              </button>
            </div>
          </div>

          {/* Artist Lists */}
          <ArtistList />

          {/* Marketplace Grid */}
          <section>
            <div className="flex justify-between items-end mb-6">
                 <h2 className="text-2xl font-bold text-white">Trending Mints</h2>
                 <button className="text-green-400 text-sm hover:underline">View All</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {MOCK_RELEASES.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="animate-fade-in">
          <MyMints />
        </div>
      )}
    </div>
  );
}
