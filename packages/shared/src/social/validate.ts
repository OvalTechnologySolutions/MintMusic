import {
  SOCIAL_PLATFORM_META,
  type SocialPlatform,
} from './platforms';
import type { SocialLinkInput } from './link';

export type { SocialLinkInput };

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeSocialUrl(raw: string): string {
  return normalizeUrl(raw);
}

export function validateSocialLink(link: SocialLinkInput): ValidationResult {
  const errors: string[] = [];
  const meta = SOCIAL_PLATFORM_META[link.platform];

  if (!link.url?.trim()) {
    return { valid: false, errors: ['URL is required'] };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(link.url));
  } catch {
    return { valid: false, errors: ['Invalid URL'] };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    errors.push('URL must use http or https');
  }

  if (meta.hostPatterns.length > 0) {
    const host = parsed.hostname.toLowerCase();
    const matches = meta.hostPatterns.some((pattern) => pattern.test(host));
    if (!matches) {
      errors.push(`URL must be a valid ${meta.label} link`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSocialLinks(links: SocialLinkInput[]): ValidationResult {
  const errors: string[] = [];
  const seen = new Set<SocialPlatform>();

  for (const link of links) {
    const result = validateSocialLink(link);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `${link.platform}: ${e}`));
    }
    if (seen.has(link.platform)) {
      errors.push(`${link.platform}: duplicate platform`);
    }
    seen.add(link.platform);
  }

  const primaryCount = links.filter((l) => l.isPrimary).length;
  if (primaryCount > 1) {
    errors.push('Only one link can be marked as primary');
  }

  return { valid: errors.length === 0, errors };
}
