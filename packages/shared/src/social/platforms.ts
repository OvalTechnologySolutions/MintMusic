/**
 * Supported artist social / streaming platforms for profile linking.
 * Extend this list when adding new integrations (e.g. bandcamp, deezer).
 */
export const SOCIAL_PLATFORMS = [
  'website',
  'youtube',
  'instagram',
  'x',
  'tiktok',
  'spotify',
  'apple_music',
  'soundcloud',
  'bandcamp',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialPlatformMeta {
  id: SocialPlatform;
  label: string;
  placeholder: string;
  /** Hostnames allowed for this platform (empty = any https URL for website) */
  hostPatterns: RegExp[];
}

export const SOCIAL_PLATFORM_META: Record<SocialPlatform, SocialPlatformMeta> = {
  website: {
    id: 'website',
    label: 'Website',
    placeholder: 'https://yourname.com',
    hostPatterns: [],
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@channel',
    hostPatterns: [/^(www\.)?youtube\.com$/i, /^youtu\.be$/i],
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    hostPatterns: [/^(www\.)?instagram\.com$/i],
  },
  x: {
    id: 'x',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    hostPatterns: [/^(www\.)?(twitter|x)\.com$/i],
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    hostPatterns: [/^(www\.)?tiktok\.com$/i],
  },
  spotify: {
    id: 'spotify',
    label: 'Spotify',
    placeholder: 'https://open.spotify.com/artist/...',
    hostPatterns: [/^(open\.)?spotify\.com$/i],
  },
  apple_music: {
    id: 'apple_music',
    label: 'Apple Music',
    placeholder: 'https://music.apple.com/...',
    hostPatterns: [/^music\.apple\.com$/i],
  },
  soundcloud: {
    id: 'soundcloud',
    label: 'SoundCloud',
    placeholder: 'https://soundcloud.com/username',
    hostPatterns: [/^(www\.)?soundcloud\.com$/i],
  },
  bandcamp: {
    id: 'bandcamp',
    label: 'Bandcamp',
    placeholder: 'https://artist.bandcamp.com',
    hostPatterns: [/\.bandcamp\.com$/i, /^bandcamp\.com$/i],
  },
};
