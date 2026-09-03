import LandingNav from '@/app/components/LandingNav';
import PublicDiscoverStore from '@/app/components/discover/PublicDiscoverStore';

export const metadata = {
  title: 'Discover — MintMusic',
  description: 'Browse limited-edition music releases from independent artists on MintMusic.',
};

export default function DiscoverPage() {
  return (
    <div className="min-h-svh bg-gray-900 text-white">
      <LandingNav />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Discover</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Explore limited-edition releases from artists on MintMusic. Sign in to collect and
            support creators directly.
          </p>
        </div>
        <PublicDiscoverStore />
      </main>
    </div>
  );
}
