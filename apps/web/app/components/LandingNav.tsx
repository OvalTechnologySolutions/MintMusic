'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export default function LandingNav() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated' && session?.user;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold gradient-text">
          MintMusic
        </Link>
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            href="/discover"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Discover
          </Link>
          <a
            href="/#about"
            className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:inline"
          >
            About
          </a>
          <a
            href="/#features"
            className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:inline"
          >
            Features
          </a>
          <a
            href="/#creators"
            className="text-gray-400 hover:text-white transition-colors text-sm hidden md:inline"
          >
            For Creators
          </a>
          {isAuthed ? (
            <>
              <Link
                href={`/u/${session.user.id}`}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Settings
              </Link>
              <Link
                href="/collector"
                className="text-gray-400 hover:text-white transition-colors text-sm hidden sm:inline"
              >
                Hub
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm px-4 py-2 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2 rounded-full transition-all hover:scale-105"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
