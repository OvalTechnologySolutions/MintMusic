'use client';

import {
  SOCIAL_PLATFORM_META,
  type SocialLink,
} from '@mintmusic/shared';
import { getPlatformIcon } from '@/lib/social/platforms-ui';

interface SocialLinksDisplayProps {
  links: SocialLink[];
  className?: string;
  showEmptyHint?: boolean;
}

export default function SocialLinksDisplay({
  links,
  className = '',
  showEmptyHint = false,
}: SocialLinksDisplayProps) {
  if (links.length === 0) {
    return (
      <p className={`text-gray-500 text-sm ${className}`}>
        {showEmptyHint
          ? 'No accounts linked yet. Add Instagram, YouTube, TikTok, Spotify, Apple Music, or SoundCloud.'
          : 'No social links added yet.'}
      </p>
    );
  }

  const sorted = [...links].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {sorted.map((link) => {
        const meta = SOCIAL_PLATFORM_META[link.platform];
        return (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 border border-gray-700 text-sm text-gray-200 hover:border-green-500 hover:text-white transition-colors"
            >
              <span
                className={`w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-[10px] font-bold ${meta.accentClass}`}
              >
                {getPlatformIcon(link.platform)}
              </span>
              <span className="font-medium">{link.label ?? meta.label}</span>
              {link.connectionType === 'oauth' && (
                <span className="text-xs text-blue-400">Verified</span>
              )}
              {link.isPrimary && (
                <span className="text-xs text-green-400">Primary</span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
