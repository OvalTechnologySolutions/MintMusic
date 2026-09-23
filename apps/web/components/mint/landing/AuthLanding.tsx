'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { MintMusicLogo } from '../brand/MintMusicLogo';
import type { MintSession } from '../lib/types';
import { Button } from '../ui/primitives';

/**
 * Landing / sign-in. Primary path is NextAuth OAuth.
 * Local demo sign-in remains for UI exploration without OAuth credentials;
 * paid Mint features require a real NextAuth session.
 */
export function AuthLanding({
  onSignIn,
  onDemoSignIn,
}: {
  onSignIn?: (s: MintSession) => void;
  onDemoSignIn?: (s: MintSession) => void;
}) {
  const [busy, setBusy] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const oauth = async (provider: 'google' | 'github') => {
    setBusy(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch {
      setError('Sign-in failed. Try again or use demo mode.');
      setBusy(null);
    }
  };

  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 mint-safe-top mint-safe-bottom mint-grain"
      style={{ background: 'var(--onyx)' }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <MintMusicLogo size={44} />
        <p className="text-[15px] lowercase tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>
          hear it fresh.
        </p>

        <div className="mt-2 flex w-full max-w-[300px] flex-col gap-3">
          <button
            disabled={busy !== null}
            onClick={() => void oauth('google')}
            className="mint-focus flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-[15px] font-semibold text-[#1a1a1a] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <GoogleGlyph />
            {busy === 'google' ? 'Continuing…' : 'Continue with Google'}
          </button>
          <Button
            variant="outline"
            full
            disabled={busy !== null}
            onClick={() => void oauth('github')}
          >
            {busy === 'github' ? 'Continuing…' : 'Continue with GitHub'}
          </Button>
          {onDemoSignIn && (
            <button
              type="button"
              className="text-center text-[12px] underline-offset-2 hover:underline"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onClick={() =>
                onDemoSignIn({
                  email: 'listener@mintmusic.app',
                  name: 'Listener',
                  provider: 'demo',
                })
              }
            >
              Explore demo without account
            </button>
          )}
        </div>
        {error && (
          <p className="max-w-[300px] text-center text-[13px]" style={{ color: '#F07178' }}>
            {error}
          </p>
        )}
        <p className="max-w-[280px] text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Creating an account unlocks discovery and paid song saves (0.25 Mint). It does not grant free
          Mint.
        </p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C38.7 37.3 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
