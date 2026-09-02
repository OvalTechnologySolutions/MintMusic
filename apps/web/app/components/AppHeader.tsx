'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import MintMusicMark from './MintMusicMark';

const primaryLinks = [
  { href: '/discover', label: 'Discover', icon: '⌕' },
  { href: '/collector', label: 'Collect', icon: '◉' },
  { href: '/creator/apply', label: 'Create', icon: '+' },
  { href: '/settings', label: 'Settings', icon: '⋯' },
] as const;

export default function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const creatorHref =
    session?.user?.creatorStatus === 'approved' ? '/creator/dashboard' : '/creator/apply';
  const links = primaryLinks.map((link) =>
    link.label === 'Create' ? { ...link, href: creatorHref } : link
  );

  return (
    <>
      <header className="app-header glass">
        <div className="app-header__inner">
          <Link href="/collector" className="mm-focus-ring rounded-lg" aria-label="MintMusic collection">
            <MintMusicMark variant="core-charcoal" decorative className="w-36 sm:w-40" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Account navigation">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
                className="app-header__link"
              >
                {link.label === 'Create' && session?.user?.creatorStatus === 'approved'
                  ? 'Studio'
                  : link.label}
              </Link>
            ))}
            {session?.user && (
              <Link href={`/u/${session.user.id}`} className="app-header__link">
                Profile
              </Link>
            )}
          </nav>
          {session?.user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="app-header__signout"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <nav className="app-tabbar md:hidden" aria-label="Primary app navigation">
        <div className="app-tabbar__inner">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`app-tabbar__item ${active ? 'app-tabbar__item--active' : ''}`}
              >
                <span className="app-tabbar__icon" aria-hidden="true">{link.icon}</span>
                <span>
                  {link.label === 'Create' && session?.user?.creatorStatus === 'approved'
                    ? 'Studio'
                    : link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
