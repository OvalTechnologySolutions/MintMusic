import type { MintMusicLogoVariant } from '../components/MintMusicMark';

export type CollectionArtworkTone = {
  luminance: number;
  warmth?: 'warm' | 'cool' | 'neutral';
};

/**
 * Selects an approved Core or Signature lockup from artwork metadata.
 * Luminance is normalized from 0 (black) to 1 (white).
 */
export function getLogoVariantForBackground({
  luminance,
  warmth = 'neutral',
}: CollectionArtworkTone): MintMusicLogoVariant {
  if (luminance < 0.24) return 'core-onyx';
  if (luminance < 0.48) return warmth === 'cool' ? 'signature-slate' : 'signature-forest';
  if (luminance < 0.76) return 'core-charcoal';
  return warmth === 'warm' ? 'signature-ivory' : 'core-paper';
}
