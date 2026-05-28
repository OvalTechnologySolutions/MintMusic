'use client';

import {
  SOCIAL_PLATFORM_META,
  type SocialLink,
} from '@mintmusic/shared';

interface SocialLinksDisplayProps {
  links: SocialLink[];
  className?: string;
}

export default function SocialLinksDisplay({
  links,
  className = '',
}: SocialLinksDisplayProps) {
  if (links.length === 0) {
    return (
      <p className={`text-gray-500 text-sm ${className}`}>
        No social links added yet.
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
              <span className="font-medium">{link.label ?? meta.label}</span>
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
