'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

type DeletionRequest = {
  id: string;
  status: string;
  requestedAt: string;
};

export default function AccountSettings() {
  const { data: session } = useSession();
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [deletionMessage, setDeletionMessage] = useState<string | null>(null);
  const [updatingDeletion, setUpdatingDeletion] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    void fetch('/api/users/me/deletion-request')
      .then((response) => response.json())
      .then((data: { request?: DeletionRequest }) => setDeletionRequest(data.request ?? null))
      .catch(() => undefined);
  }, [session?.user?.id]);

  const requestDeletion = async () => {
    if (!window.confirm('Request permanent deletion of your MintMusic account and personal data?')) {
      return;
    }
    setUpdatingDeletion(true);
    setDeletionMessage(null);
    try {
      const response = await fetch('/api/users/me/deletion-request', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to request deletion');
      setDeletionRequest(data.request);
      setDeletionMessage('Deletion requested. We will verify and complete it within 30 days.');
    } catch (error) {
      setDeletionMessage(error instanceof Error ? error.message : 'Unable to request deletion');
    } finally {
      setUpdatingDeletion(false);
    }
  };

  const cancelDeletion = async () => {
    setUpdatingDeletion(true);
    setDeletionMessage(null);
    try {
      const response = await fetch('/api/users/me/deletion-request', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to cancel deletion');
      setDeletionRequest(null);
      setDeletionMessage('Your deletion request was cancelled.');
    } catch (error) {
      setDeletionMessage(error instanceof Error ? error.message : 'Unable to cancel deletion');
    } finally {
      setUpdatingDeletion(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Account</h2>
      {session?.user?.id && (
        <p className="text-sm text-gray-400">
          Your public profile:{' '}
          <Link href={`/u/${session.user.id}`} className="text-green-400 hover:underline">
            mintmusic.ai/u/{session.user.id}
          </Link>
        </p>
      )}
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

      <section className="mt-8 border-t border-gray-700 pt-6" aria-labelledby="account-deletion-title">
        <h3 id="account-deletion-title" className="font-semibold text-red-300">Delete account</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          This starts permanent deletion of your profile and personal data. Financial and
          transaction records may be retained where legally required. Requests are completed
          within 30 days.
        </p>
        {deletionRequest ? (
          <div className="mt-4 rounded-xl border border-amber-700/60 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200">
              Deletion requested on {new Date(deletionRequest.requestedAt).toLocaleDateString()}.
            </p>
            <button
              type="button"
              disabled={updatingDeletion}
              onClick={() => void cancelDeletion()}
              className="mt-3 rounded-lg border border-gray-500 px-4 py-2 text-sm disabled:opacity-50"
            >
              Keep my account
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={updatingDeletion}
            onClick={() => void requestDeletion()}
            className="mt-4 rounded-lg border border-red-700 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
          >
            {updatingDeletion ? 'Submitting…' : 'Request account deletion'}
          </button>
        )}
        {deletionMessage ? <p role="status" className="mt-3 text-sm text-gray-300">{deletionMessage}</p> : null}
        <p className="mt-4 text-xs text-gray-500">
          Learn more on the <Link href="/account-deletion" className="underline">account deletion page</Link>.
        </p>
      </section>
    </div>
  );
}
