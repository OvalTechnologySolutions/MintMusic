'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import MintMusicMark from './MintMusicMark';

export default function LandingNav() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated' && session?.user;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > 24);
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
    return () => window.removeEventListener('scroll', updateNav);
  }, []);

  return (
    <nav className={`landing-nav ${isScrolled ? 'landing-nav--solid' : ''}`} aria-label="Main navigation">
      <div className="mm-shell flex h-[4.75rem] items-center justify-between">
        <Link href="/" className="mm-focus-ring rounded-lg" aria-label="MintMusic home">
          <MintMusicMark
            variant={isScrolled ? 'core-charcoal' : 'core-onyx'}
            decorative={false}
            className="w-[9.5rem] sm:w-[10.5rem]"
          />
        </Link>
        <div className="flex items-center gap-4 sm:gap-7">
          <Link
            href="/#collections"
            className="nav-link hidden sm:inline-flex"
          >
            Collections
          </Link>
          <Link
            href="/#how-it-works"
            className="nav-link hidden md:inline-flex"
          >
            How it works
          </Link>
          <Link
            href="/#for-artists"
            className="nav-link hidden lg:inline-flex"
          >
            For artists
          </Link>
          {isAuthed ? (
            <>
              <Link
                href={`/u/${session.user.id}`}
                className="nav-link hidden sm:inline-flex"
              >
                Your shelf
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="mm-button mm-button--ghost px-4 py-2 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="mm-button mm-button--small"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
