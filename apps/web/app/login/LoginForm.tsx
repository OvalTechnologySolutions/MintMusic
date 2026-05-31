'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/collector';

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
      <div className="space-y-3">
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
