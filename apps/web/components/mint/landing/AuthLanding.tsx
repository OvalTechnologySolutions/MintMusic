'use client';

import { useState } from 'react';
import { MintMusicLogo } from '../brand/MintMusicLogo';
import type { MintSession } from '../lib/types';
import { Button } from '../ui/primitives';

/**
 * Minimal, confident landing. No marketing sections.
 * NOTE: For the MVP demo this signs in locally (no external creds required).
 * Production wires "Continue with Google" to Supabase/NextAuth OAuth and email
 * to a magic link. See README → Authentication.
 */
export function AuthLanding({ onSignIn }: { onSignIn: (s: MintSession) => void }) {
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState('');

  const nameFromEmail = (e: string) => {
    const local = e.split('@')[0] || 'Listener';
    return local.charAt(0).toUpperCase() + local.slice(1);
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
          {!emailMode ? (
            <>
              <button
                onClick={() => onSignIn({ email: 'listener@mintmusic.app', name: 'Listener', provider: 'google' })}
                className="mint-focus flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-[15px] font-semibold text-[#1a1a1a] transition-opacity hover:opacity-90"
              >
                <GoogleGlyph />
                Continue with Google
              </button>
              <Button variant="outline" full onClick={() => setEmailMode(true)}>
                Continue with email
              </Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
                onSignIn({ email, name: nameFromEmail(email), provider: 'email' });
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mint-focus min-h-[48px] w-full rounded-full bg-transparent px-5 text-center text-[15px] text-white"
                style={{ border: '1px solid rgba(255,255,255,0.16)' }}
              />
              <Button variant="primary" type="submit" full>
                Continue
              </Button>
              <button
                type="button"
                onClick={() => setEmailMode(false)}
                className="mint-focus text-[13px]"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                ← back
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className="flex gap-6 pb-6 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
        <span>Terms</span>
        <span>Privacy</span>
      </footer>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
