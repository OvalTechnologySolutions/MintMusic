'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    'Sign-in was denied. Usually the API is not running or could not save your profile. Start the API with npm run dev:api, then try again.',
  Configuration:
    'Auth is misconfigured. Check AUTH_SECRET and OAuth client IDs in apps/web/.env.local.',
  OAuthSignin: 'Could not start OAuth sign-in. Check your Apple, Google, or GitHub app settings.',
  OAuthCallback: 'OAuth callback failed. Verify the provider callback URL.',
  Default: 'Sign-in failed. Ensure npm run dev:api is running, then try again.',
};

export default function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/collector';
  const errorCode = searchParams.get('error');
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default
    : null;

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  return (
    <div className="max-w-md w-full">
      <Link href="/" className="text-2xl font-bold gradient-text block mb-8">
        MintMusic
      </Link>
      <h1 className="text-3xl font-bold mb-2">Sign in to collect</h1>
      <p className="text-gray-400 mb-8">
        Use OAuth to access your collector hub. Wallet connection is in Settings
        when you need on-chain features.
      </p>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => signIn('apple', { callbackUrl })}
          className="w-full rounded-xl bg-black px-6 py-3 font-semibold text-white ring-1 ring-white/30 hover:bg-gray-950"
        >
          Continue with Apple
        </button>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-100"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => signIn('github', { callbackUrl })}
          className="w-full bg-gray-800 border border-gray-600 font-semibold py-3 px-6 rounded-xl hover:border-green-500"
        >
          Continue with GitHub
        </button>
      </div>
      <p className="text-gray-500 text-sm mt-8 text-center">
        Want to sell on MintMusic?{' '}
        <Link href="/creator/apply" className="text-green-400 hover:underline">
          Apply as a creator
        </Link>
      </p>
    </div>
  );
}
