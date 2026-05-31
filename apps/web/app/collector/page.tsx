import AppHeader from '../components/AppHeader';
import FanView from '../components/FanView';
import Web3Provider from '@/components/Web3Provider';

export default function CollectorPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Collector Hub</h1>
          <p className="text-gray-400 mt-2">
            Discover releases, manage your collection, and support artists.
          </p>
        </div>
        <Web3Provider>
          <FanView />
        </Web3Provider>
      </main>
    </div>
  );
}
