'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function AppHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 glass border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/collector" className="text-2xl font-bold gradient-text">
          MintMusic
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/collector"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Collect
          </Link>
          <Link
            href="/creator/apply"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Become a Creator
          </Link>
          {session?.user?.creatorStatus === 'approved' && (
            <Link
              href="/creator/dashboard"
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              Creator Studio
            </Link>
          )}
          <Link
            href="/settings"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Settings
          </Link>
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 hidden sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm px-4 py-2 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
