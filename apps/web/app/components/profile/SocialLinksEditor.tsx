'use client';

import { useState } from 'react';
import {
  PROFILE_SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  validateSocialLinks,
  type SocialLinkInput,
  type SocialPlatform,
} from '@mintmusic/shared';
import { getPlatformIcon } from '@/lib/social/platforms-ui';

interface SocialLinksEditorProps {
  initialLinks?: SocialLinkInput[];
  onSave: (links: SocialLinkInput[]) => Promise<void>;
  onCancel?: () => void;
}

export default function SocialLinksEditor({
  initialLinks = [],
  onSave,
  onCancel,
}: SocialLinksEditorProps) {
  const [links, setLinks] = useState<SocialLinkInput[]>(() => {
    if (initialLinks.length > 0) {
      const byPlatform = new Map(initialLinks.map((l) => [l.platform, l]));
      return PROFILE_SOCIAL_PLATFORMS.map(
        (platform) => byPlatform.get(platform) ?? { platform, url: '' }
      );
    }
    return PROFILE_SOCIAL_PLATFORMS.map((platform) => ({ platform, url: '' }));
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const updateLink = (platform: SocialPlatform, patch: Partial<SocialLinkInput>) => {
    setLinks((prev) =>
      prev.map((l) => (l.platform === platform ? { ...l, ...patch } : l))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = links.filter((l) => l.url.trim());
    const validation = validateSocialLinks(filled);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await onSave(filled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {PROFILE_SOCIAL_PLATFORMS.map((platform) => {
        const meta = SOCIAL_PLATFORM_META[platform];
        const link = links.find((l) => l.platform === platform)!;
        return (
          <div key={platform} className="flex gap-3 items-start">
            <div
              className={`w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center text-xs font-bold shrink-0 ${meta.accentClass}`}
              aria-hidden
            >
              {getPlatformIcon(platform)}
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {meta.label}
              </label>
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(platform, { url: e.target.value })}
                placeholder={meta.placeholder}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={link.isPrimary ?? false}
                  onChange={(e) =>
                    updateLink(platform, { isPrimary: e.target.checked })
                  }
                  className="accent-green-500"
                />
                Primary link on profile
              </label>
            </div>
          </div>
        );
      })}

      {errors.length > 0 && (
        <ul className="text-red-400 text-sm space-y-1">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-6 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save links'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-3 px-6 rounded-xl border border-gray-600 text-gray-300 hover:border-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
