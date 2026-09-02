'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SocialLinkInput } from '@mintmusic/shared';
import SocialLinksDisplay from './SocialLinksDisplay';
import SocialLinksEditor from './SocialLinksEditor';

export default function ArtistProfilePanel() {
  const [storedLinks, setStoredLinks] = useState<
    Array<SocialLinkInput & { id: string; connectionType?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/users/me');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      const socialLinks = data.user?.socialLinks ?? [];
      setStoredLinks(socialLinks);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveLinks = async (inputs: SocialLinkInput[]) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socialLinks: inputs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Save failed');
    setStoredLinks(data.user.socialLinks ?? []);
    setEditing(false);
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Artist Hub</h2>
          <p className="text-gray-400 text-sm mt-1">
            Public social & streaming links for fans, brands, and discovery
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-green-400 hover:underline"
          >
            Edit links
          </button>
        )}
      </div>

      {apiError && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">
          {apiError}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading profile…</p>
      ) : editing ? (
        <SocialLinksEditor
          initialLinks={storedLinks.map((l) => ({
            platform: l.platform,
            url: l.url,
            label: l.label,
            isPrimary: l.isPrimary,
          }))}
          onSave={handleSaveLinks}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <SocialLinksDisplay links={storedLinks as never} showEmptyHint />
      )}
    </div>
  );
}
