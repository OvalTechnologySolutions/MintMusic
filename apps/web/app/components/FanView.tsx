'use client';

import MyMints from './MyMints';

export default function FanView() {
  return (
    <div className="space-y-8">
      <div className="bg-gray-800/50 rounded-2xl p-12 border border-dashed border-gray-600 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-green-400 uppercase tracking-widest mb-4">
          MVP 2026
        </span>
        <h2 className="text-3xl font-bold text-white mb-3">Marketplace coming soon</h2>
        <p className="text-gray-400 max-w-lg mx-auto mb-6">
          Releases will load from the API and on-chain indexer. Legacy mock data has been
          removed. Connect your wallet and view collected editions below.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold text-white mb-6">My Collection</h2>
        <MyMints />
      </section>
    </div>
  );
}
