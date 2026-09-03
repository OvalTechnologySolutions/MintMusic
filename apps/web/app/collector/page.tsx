import AppHeader from '../components/AppHeader';
import FanView from '../components/FanView';
import DiscoverStore from '../components/collector/DiscoverStore';
import MyCollection from '../components/collector/MyCollection';
import Web3Provider from '@/components/Web3Provider';

export default function CollectorPage() {
  return (
    <div className="app-screen">
      <AppHeader />
      <main className="app-main">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Collector Hub</h1>
          <p className="text-gray-400 mt-2">
            Discover releases, manage your collection, and support artists.
          </p>
        </div>
        <Web3Provider>
          <div className="space-y-8">
            <DiscoverStore />
            <MyCollection />
            <FanView />
          </div>
        </Web3Provider>
      </main>
    </div>
  );
}
