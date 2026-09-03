'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppHeader from '@/app/components/AppHeader';
import Web3Provider from '@/components/Web3Provider';
import CreatorStudio from '@/app/components/creator/CreatorStudio';

export default function CreatorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/creator/dashboard');
      return;
    }
    if (status === 'authenticated' && session?.user?.creatorStatus !== 'approved') {
      router.replace('/creator/apply');
    }
  }, [status, session, router]);

  if (status !== 'authenticated' || session?.user?.creatorStatus !== 'approved') {
    return <div className="min-h-svh bg-gray-900" />;
  }

  return (
    <div className="app-screen">
      <AppHeader />
      <main className="app-main">
        <h1 className="text-3xl font-bold mb-2">Creator Studio</h1>
        <p className="text-gray-400 mb-8">
          Manage releases, social links, and Stripe payouts.
        </p>
        <Web3Provider>
          <CreatorStudio />
        </Web3Provider>
      </main>
    </div>
  );
}
