import Link from 'next/link';
import LandingNav from '@/app/components/LandingNav';

export default function NotFound() {
  return (
    <div className="min-h-svh bg-gray-900 text-white">
      <LandingNav />
      <main className="max-w-lg mx-auto px-6 pt-32 pb-16 text-center">
        <p className="text-6xl font-black gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors"
          >
            Home
          </Link>
          <Link
            href="/discover"
            className="px-6 py-3 rounded-full border border-gray-600 hover:border-green-500 transition-colors"
          >
            Discover
          </Link>
        </div>
      </main>
    </div>
  );
}
