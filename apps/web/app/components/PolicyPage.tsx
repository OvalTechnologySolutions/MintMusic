import Link from 'next/link';
import type { ReactNode } from 'react';
import { MintMusicLogo } from '@/components/mint/brand/MintMusicLogo';

export default function PolicyPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-[var(--mm-onyx)] px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-[var(--mm-paper)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mm-focus-ring inline-flex rounded-lg" aria-label="MintMusic home">
          <MintMusicLogo size={30} variant="dark" />
        </Link>
        <article className="policy-page mt-12">
          <p className="mm-eyebrow text-[var(--mm-mint-soft)]">{eyebrow}</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {updated ? <p className="mt-4 text-sm text-gray-400">Last updated: {updated}</p> : null}
          <div className="mt-10 space-y-8 leading-7 text-gray-300">{children}</div>
        </article>
        <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-gray-800 pt-6 text-sm" aria-label="Policies">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
          <Link href="/account-deletion">Account deletion</Link>
        </nav>
      </div>
    </main>
  );
}
