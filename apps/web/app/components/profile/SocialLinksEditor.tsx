'use client';

import { useState } from 'react';
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  validateSocialLinks,
  type SocialLinkInput,
  type SocialPlatform,
} from '@mintmusic/shared';

interface SocialLinksEditorProps {
  initialLinks?: SocialLinkInput[];
  onSave: (links: SocialLinkInput[]) => Promise<void>;
}

const DEFAULT_PLATFORMS: SocialPlatform[] = [
  'website',
  'spotify',
  'apple_music',
  'youtube',
  'instagram',
  'soundcloud',
];

export default function SocialLinksEditor({
  initialLinks = [],
  onSave,
}: SocialLinksEditorProps) {
  const [links, setLinks] = useState<SocialLinkInput[]>(() => {
    if (initialLinks.length > 0) return initialLinks;
    return DEFAULT_PLATFORMS.map((platform) => ({ platform, url: '' }));
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const updateLink = (index: number, patch: Partial<SocialLinkInput>) => {
    setLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  };

  const addPlatform = (platform: SocialPlatform) => {
    if (links.some((l) => l.platform === platform)) return;
    setLinks((prev) => [...prev, { platform, url: '' }]);
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
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

  const availableToAdd = SOCIAL_PLATFORMS.filter(
    (p) => !links.some((l) => l.platform === p)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-gray-400 text-sm">
        Link your streaming and social profiles. Fans see these on your artist hub.
      </p>

      {links.map((link, index) => {
        const meta = SOCIAL_PLATFORM_META[link.platform];
        return (
          <div key={`${link.platform}-${index}`} className="flex gap-2 items-start">
            <div className="w-28 pt-3 text-sm font-medium text-gray-300 shrink-0">
              {meta.label}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(index, { url: e.target.value })}
                placeholder={meta.placeholder}
                className="w-full bg-gray-900 border border-gray-700 p-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={link.isPrimary ?? false}
                  onChange={(e) =>
                    updateLink(index, {
                      isPrimary: e.target.checked,
                    })
                  }
                  className="accent-green-500"
                />
                Show as primary link
              </label>
            </div>
            <button
              type="button"
              onClick={() => removeLink(index)}
              className="pt-3 text-gray-500 hover:text-red-400 text-sm"
              aria-label={`Remove ${meta.label}`}
            >
              Remove
            </button>
          </div>
        );
      })}

      {availableToAdd.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableToAdd.map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => addPlatform(platform)}
              className="text-xs px-3 py-1 rounded-full border border-dashed border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400"
            >
              + {SOCIAL_PLATFORM_META[platform].label}
            </button>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="text-red-400 text-sm space-y-1">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-6 rounded-xl disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save profile links'}
      </button>
    </form>
  );
}
