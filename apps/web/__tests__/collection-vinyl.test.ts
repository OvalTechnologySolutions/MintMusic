import { describe, expect, it } from 'vitest';
import { collectionVinylIntent } from '../components/mint/collection/vinylIntent';

describe('collectionVinylIntent', () => {
  it('loads the featured crate record when Discover left a different song in the engine', () => {
    expect(collectionVinylIntent('collected-a', 'discover-b')).toBe('load');
  });

  it('toggles when the engine is already on the featured crate record', () => {
    expect(collectionVinylIntent('collected-a', 'collected-a')).toBe('toggle');
  });

  it('loads when the engine is idle', () => {
    expect(collectionVinylIntent('collected-a', null)).toBe('load');
  });

  it('does nothing when the crate has no featured record', () => {
    expect(collectionVinylIntent(null, 'discover-b')).toBe('none');
  });
});
