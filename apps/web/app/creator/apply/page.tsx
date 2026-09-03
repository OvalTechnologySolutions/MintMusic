'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppHeader from '@/app/components/AppHeader';

export default function CreatorApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [whyJoin, setWhyJoin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/creator/apply');
    }
    if (session?.user?.creatorStatus === 'approved') {
      router.replace('/creator/dashboard');
    }
  }, [status, session, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/creator-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistName,
        genre,
        bio,
        portfolioUrl: portfolioUrl || undefined,
        whyJoin,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? 'Submission failed');
      return;
    }
    setSuccess(true);
  };

  if (status === 'loading') {
    return <div className="min-h-svh bg-gray-900" />;
  }

  return (
    <div className="app-screen">
      <AppHeader />
      <main className="app-main max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Become a Creator</h1>
        <p className="text-gray-400 mb-8">
          Early access: submit your interest and we&apos;ll review your application.
          Collectors sign in with OAuth; creators go through this separate onboarding
          during launch.
        </p>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/40 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-green-400 mb-2">Application received</h2>
            <p className="text-gray-300">
              We&apos;ll email you at {session?.user?.email} when your creator account
              is approved. Until then, enjoy the collector experience.
            </p>
            <Link
              href="/collector"
              className="inline-block mt-6 text-green-400 hover:underline"
            >
              Back to Collector Hub
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-4 sm:p-8">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Artist / project name</label>
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <input
                required
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Portfolio URL (optional)</label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Why join MintMusic?</label>
              <textarea
                required
                rows={3}
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
