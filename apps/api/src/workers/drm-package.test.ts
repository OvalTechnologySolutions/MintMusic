import { describe, expect, it } from 'vitest';
import { drmPackageJobOutcome } from './drm-package.js';

describe('drmPackageJobOutcome', () => {
  it('does not mark placeholder manifests as playback-ready', () => {
    const outcome = drmPackageJobOutcome('mock');

    expect(outcome.asset.drmStatus).toBe('failed');
    expect(outcome.asset.widevineReady).toBe(false);
    expect(outcome.asset.fairplayReady).toBe(false);
    expect(outcome.job.status).toBe('failed');
    expect(outcome.job.errorMessage).toMatch(/not implemented/);
  });

  it('fails closed for production provider names until a packager is wired', () => {
    for (const provider of ['aws_mediaconvert', 'ezdrm', 'axinom', 'pallycon']) {
      const outcome = drmPackageJobOutcome(provider);
      expect(outcome.asset.drmStatus).toBe('failed');
      expect(outcome.job.status).toBe('failed');
    }
  });
});
