'use client';

import { useAccount } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import type { ArtistProfile, SocialLinkInput } from '@mintmusic/shared';
import { getArtistProfile, updateArtistProfile } from '@/lib/api/artists';
import { ApiError } from '@/lib/api/client';
import SocialLinksDisplay from './SocialLinksDisplay';
import SocialLinksEditor from './SocialLinksEditor';

export default function ArtistProfilePanel() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setApiError(null);
    try {
      const { profile: data } = await getArtistProfile(address);
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setApiError('API unreachable. Start the server with npm run dev:api');
      } else {
        setApiError(err instanceof Error ? err.message : 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveLinks = async (links: SocialLinkInput[]) => {
    if (!address) return;
    const { profile: updated } = await updateArtistProfile(address, {
      socialLinks: links,
      displayName: profile?.displayName,
      bio: profile?.bio,
    });
    setProfile(updated);
    setEditing(false);
  };

  if (!isConnected || !address) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 text-gray-400 text-sm">
        Connect your wallet to manage your artist hub and social links.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Artist Hub</h2>
          <p className="text-gray-400 text-sm mt-1">
            Your public links for fans, brands, and industry discovery
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
          initialLinks={profile?.socialLinks.map((l) => ({
            platform: l.platform,
            url: l.url,
            label: l.label,
            isPrimary: l.isPrimary,
          }))}
          onSave={handleSaveLinks}
        />
      ) : (
        <SocialLinksDisplay links={profile?.socialLinks ?? []} />
      )}
    </div>
  );
}
