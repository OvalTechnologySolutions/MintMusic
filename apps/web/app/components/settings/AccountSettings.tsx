'use client';

import { useSession } from 'next-auth/react';

export default function AccountSettings() {
  const { data: session } = useSession();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Account</h2>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Name</dt>
          <dd className="text-white">{session?.user?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Email</dt>
          <dd className="text-white">{session?.user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Role</dt>
          <dd className="text-white capitalize">{session?.user?.role ?? 'collector'}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Creator status</dt>
          <dd className="text-white capitalize">
            {session?.user?.creatorStatus ?? 'none'}
          </dd>
        </div>
      </dl>
    </div>
  );
}
