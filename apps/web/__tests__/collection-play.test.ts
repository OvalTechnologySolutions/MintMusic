import { describe, expect, it } from 'vitest';
import { resolveCollectionPlayIntent } from '../components/mint/lib/collection-play';

describe('resolveCollectionPlayIntent', () => {
  it('no-ops when the crate has no selected record', () => {
    expect(resolveCollectionPlayIntent(null, 'seed-nightbloom')).toBe('noop');
    expect(resolveCollectionPlayIntent(null, null)).toBe('noop');
  });

  it('toggles only when the engine is already on the visible record', () => {
    expect(resolveCollectionPlayIntent('seed-terracotta', 'seed-terracotta')).toBe('toggle');
  });

  it('loads the visible record when Discover left a different song in the engine', () => {
    // Collect song A, skip to song B in Discover, then open Collection.
    // The turntable shows A (newest collect) while the engine still holds B.
    expect(resolveCollectionPlayIntent('seed-nightbloom', 'seed-glasshour')).toBe(
      'play-selected',
    );
  });

  it('loads the visible record when nothing is loaded yet', () => {
    expect(resolveCollectionPlayIntent('seed-nightbloom', null)).toBe('play-selected');
  });
});
