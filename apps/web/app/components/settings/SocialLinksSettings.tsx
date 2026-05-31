'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SocialLink, SocialLinkInput } from '@mintmusic/shared';
import SocialLinksDisplay from '../profile/SocialLinksDisplay';
import SocialLinksEditor from '../profile/SocialLinksEditor';

export default function SocialLinksSettings() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/me');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');
      setLinks(data.user?.socialLinks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (inputs: SocialLinkInput[]) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socialLinks: inputs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Save failed');
    setLinks(data.user.socialLinks ?? []);
    setEditing(false);
  };

  const tryOAuthConnect = async (platform: string) => {
    const res = await fetch(`/api/social/connect/${platform}`, { method: 'POST' });
    const data = await res.json();
    if (data.mode === 'oauth_redirect' && data.authorizeUrl) {
      window.location.href = data.authorizeUrl;
      return;
    }
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold mb-2">Linked accounts</h2>
          <p className="text-gray-400 text-sm">
            Connect Instagram, YouTube, TikTok, Spotify, Apple Music, and SoundCloud.
            Paste profile URLs now; official platform sign-in is coming soon.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm text-green-400 hover:underline shrink-0"
          >
            Edit links
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : editing ? (
        <SocialLinksEditor
          initialLinks={links.map((l) => ({
            platform: l.platform,
            url: l.url,
            label: l.label,
            isPrimary: l.isPrimary,
          }))}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <SocialLinksDisplay links={links} showEmptyHint />
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-3">Quick connect (when available)</p>
            <div className="flex flex-wrap gap-2">
              {(['instagram', 'youtube', 'tiktok', 'spotify', 'apple_music', 'soundcloud'] as const).map(
                (platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => tryOAuthConnect(platform)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400"
                  >
                    Connect {platform.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
