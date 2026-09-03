'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import MintMusicMark from './MintMusicMark';

export default function LandingNav() {
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated' && session?.user;
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const updateNav = () => setIsScrolled(window.scrollY > 24);
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
    return () => window.removeEventListener('scroll', updateNav);
  }, []);

  return (
    <nav className={`landing-nav ${isScrolled || menuOpen ? 'landing-nav--solid' : ''}`} aria-label="Main navigation">
      <div className="mm-shell flex h-[4.75rem] items-center justify-between">
        <Link href="/" className="mm-focus-ring rounded-lg" aria-label="MintMusic home">
          <MintMusicMark
            variant={isScrolled ? 'core-charcoal' : 'core-onyx'}
            decorative={false}
            className="w-[9.5rem] sm:w-[10.5rem]"
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-7">
          <Link
            href="/#collections"
            className="nav-link hidden lg:inline-flex"
          >
            Collections
          </Link>
          <Link
            href="/#how-it-works"
            className="nav-link hidden lg:inline-flex"
          >
            How it works
          </Link>
          <Link
            href="/#for-artists"
            className="nav-link hidden lg:inline-flex"
          >
            For artists
          </Link>
          <Link href="/install" className="nav-link hidden lg:inline-flex">
            Install
          </Link>
          {isAuthed ? (
            <>
              <Link
                href={`/u/${session.user.id}`}
                className="nav-link hidden lg:inline-flex"
              >
                Your shelf
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="mm-button mm-button--ghost hidden px-4 py-2 text-sm lg:inline-flex"
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
          <button
            type="button"
            className="mobile-menu-button lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
          </button>
        </div>
      </div>
      <div
        id="landing-mobile-menu"
        className={`landing-mobile-menu lg:hidden ${menuOpen ? 'landing-mobile-menu--open' : ''}`}
        hidden={!menuOpen}
      >
        <div className="mm-shell grid gap-1 py-3">
          <Link onClick={() => setMenuOpen(false)} href="/#collections" className="landing-mobile-menu__link">Collections</Link>
          <Link onClick={() => setMenuOpen(false)} href="/#how-it-works" className="landing-mobile-menu__link">How it works</Link>
          <Link onClick={() => setMenuOpen(false)} href="/#for-artists" className="landing-mobile-menu__link">For artists</Link>
          <Link onClick={() => setMenuOpen(false)} href="/discover" className="landing-mobile-menu__link">Discover music</Link>
          <Link onClick={() => setMenuOpen(false)} href="/install" className="landing-mobile-menu__link">Install app</Link>
          {isAuthed ? (
            <>
              <Link onClick={() => setMenuOpen(false)} href={`/u/${session.user.id}`} className="landing-mobile-menu__link">Your shelf</Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="landing-mobile-menu__link text-left"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
