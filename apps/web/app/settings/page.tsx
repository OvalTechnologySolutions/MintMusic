'use client';

import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import AppHeader from '../components/AppHeader';
import Web3Provider from '@/components/Web3Provider';
import WalletSettings from '../components/settings/WalletSettings';
import PaymentsSettings from '../components/settings/PaymentsSettings';
import AccountSettings from '../components/settings/AccountSettings';
import SocialLinksSettings from '../components/settings/SocialLinksSettings';

type Tab = 'account' | 'social' | 'wallet' | 'payments';

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'account';
  const [tab, setTab] = useState<Tab>(initialTab);

  const isApprovedCreator = session?.user?.creatorStatus === 'approved';

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'account', label: 'Account', show: true },
    { id: 'social', label: 'Social & Streaming', show: true },
    { id: 'wallet', label: 'Wallet', show: true },
    { id: 'payments', label: 'Payments & Payouts', show: isApprovedCreator },
  ];

  return (
    <div className="app-screen">
      <AppHeader />
      <main className="app-main max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">
          Manage your account, linked social profiles, wallet, and creator payouts.
        </p>

        <div className="scrollbar-hide -mx-4 mb-8 flex snap-x gap-1 overflow-x-auto border-b border-gray-800 px-4">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-w-max snap-start border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-4 sm:p-8">
          {tab === 'account' && <AccountSettings />}
          {tab === 'social' && <SocialLinksSettings />}
          {tab === 'wallet' && (
            <Web3Provider>
              <WalletSettings />
            </Web3Provider>
          )}
          {tab === 'payments' && isApprovedCreator && <PaymentsSettings />}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-gray-900" />}>
      <SettingsContent />
    </Suspense>
  );
}
