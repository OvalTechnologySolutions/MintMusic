import {
  PROFILE_SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_META,
  type SocialPlatform,
} from '@mintmusic/shared';

const PLATFORM_ICONS: Record<ProfileSocialPlatform, string> = {
  instagram: 'IG',
  youtube: 'YT',
  tiktok: 'TT',
  spotify: 'SP',
  apple_music: 'AM',
  soundcloud: 'SC',
};

type ProfileSocialPlatform = (typeof PROFILE_SOCIAL_PLATFORMS)[number];

export function getPlatformIcon(platform: SocialPlatform): string {
  if (platform in PLATFORM_ICONS) {
    return PLATFORM_ICONS[platform as ProfileSocialPlatform];
  }
  return SOCIAL_PLATFORM_META[platform].label.slice(0, 2).toUpperCase();
}

export { PROFILE_SOCIAL_PLATFORMS, SOCIAL_PLATFORM_META };
