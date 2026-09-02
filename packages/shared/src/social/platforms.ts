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

/** Primary profile platforms shown in Settings / artist hub */
export const PROFILE_SOCIAL_PLATFORMS = [
  'instagram',
  'youtube',
  'tiktok',
  'spotify',
  'apple_music',
  'soundcloud',
] as const satisfies readonly SocialPlatform[];

export type ProfileSocialPlatform = (typeof PROFILE_SOCIAL_PLATFORMS)[number];

export interface SocialPlatformMeta {
  id: SocialPlatform;
  label: string;
  placeholder: string;
  /** Hostnames allowed for this platform (empty = any https URL for website) */
  hostPatterns: RegExp[];
  /** Tailwind-friendly accent for UI chips */
  accentClass: string;
}

export const SOCIAL_PLATFORM_META: Record<SocialPlatform, SocialPlatformMeta> = {
  website: {
    id: 'website',
    label: 'Website',
    placeholder: 'https://yourname.com',
    hostPatterns: [],
    accentClass: 'text-gray-300',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@channel',
    hostPatterns: [/^(www\.)?youtube\.com$/i, /^youtu\.be$/i],
    accentClass: 'text-red-400',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    hostPatterns: [/^(www\.)?instagram\.com$/i],
    accentClass: 'text-pink-400',
  },
  x: {
    id: 'x',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    hostPatterns: [/^(www\.)?(twitter|x)\.com$/i],
    accentClass: 'text-sky-400',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    hostPatterns: [/^(www\.)?tiktok\.com$/i],
    accentClass: 'text-cyan-300',
  },
  spotify: {
    id: 'spotify',
    label: 'Spotify',
    placeholder: 'https://open.spotify.com/artist/...',
    hostPatterns: [/^(open\.)?spotify\.com$/i],
    accentClass: 'text-green-400',
  },
  apple_music: {
    id: 'apple_music',
    label: 'Apple Music',
    placeholder: 'https://music.apple.com/...',
    hostPatterns: [/^music\.apple\.com$/i],
    accentClass: 'text-rose-400',
  },
  soundcloud: {
    id: 'soundcloud',
    label: 'SoundCloud',
    placeholder: 'https://soundcloud.com/username',
    hostPatterns: [/^(www\.)?soundcloud\.com$/i],
    accentClass: 'text-orange-400',
  },
  bandcamp: {
    id: 'bandcamp',
    label: 'Bandcamp',
    placeholder: 'https://artist.bandcamp.com',
    hostPatterns: [/\.bandcamp\.com$/i, /^bandcamp\.com$/i],
    accentClass: 'text-indigo-300',
  },
};
