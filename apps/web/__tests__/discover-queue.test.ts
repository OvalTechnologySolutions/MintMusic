import { describe, expect, it } from 'vitest';
import { willExhaustDiscoverQueue } from '../components/mint/discovery/queue';

describe('willExhaustDiscoverQueue', () => {
  it('is true when skipping the only remaining record', () => {
    expect(willExhaustDiscoverQueue(0, 1)).toBe(true);
  });

  it('is true when skipping the last of several records', () => {
    expect(willExhaustDiscoverQueue(5, 6)).toBe(true);
  });

  it('is false when more records remain after this skip', () => {
    expect(willExhaustDiscoverQueue(0, 6)).toBe(false);
    expect(willExhaustDiscoverQueue(4, 6)).toBe(false);
  });

  it('is false for an empty queue so mount does not pause leftover playback', () => {
    expect(willExhaustDiscoverQueue(0, 0)).toBe(false);
  });
});
