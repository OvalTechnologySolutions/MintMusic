import type { SocialLink, SocialLinkInput } from '@mintmusic/shared';
import {
  normalizeSocialUrl,
  validateSocialLinks,
} from '@mintmusic/shared';

function newSocialLinkId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function mapSocialLinkInputs(
  inputs: SocialLinkInput[],
  existing: SocialLink[] = []
): SocialLink[] {
  const now = new Date().toISOString();
  const existingByPlatform = new Map(existing.map((l) => [l.platform, l]));

  return inputs.map((input) => {
    const prev = existingByPlatform.get(input.platform);
    return {
      id: prev?.id ?? newSocialLinkId(),
      platform: input.platform,
      url: normalizeSocialUrl(input.url),
      label: input.label,
      isPrimary: input.isPrimary ?? false,
      connectionType: prev?.connectionType ?? 'manual',
      externalAccountId: prev?.externalAccountId,
      verifiedAt: prev?.verifiedAt,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
  });
}

export function assertValidSocialLinks(inputs: SocialLinkInput[]): void {
  const validation = validateSocialLinks(inputs);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }
}
