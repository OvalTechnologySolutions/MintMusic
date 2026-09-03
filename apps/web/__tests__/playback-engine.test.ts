import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackEngine } from '../components/mint/lib/audio';
import type { Song } from '../components/mint/lib/types';

class FakeParam {
  value = 0;
  cancelScheduledValues() {}
  linearRampToValueAtTime() {}
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeNode {
  disconnected = false;
  connect() {
    return this;
  }
  disconnect() {
    this.disconnected = true;
  }
}

class FakeOscillator extends FakeNode {
  frequency = new FakeParam();
  detune = new FakeParam();
  type = 'sine';
  stopped = false;
  start() {}
  stop() {
    this.stopped = true;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}

const oscillators: FakeOscillator[] = [];

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    const osc = new FakeOscillator();
    oscillators.push(osc);
    return osc;
  }
  createBiquadFilter() {
    return new FakeFilter();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

const synthSong = (id: string): Song => ({
  id,
  title: id,
  artist: 'Test',
  artistSlug: 'test',
  artwork: { from: '#000', to: '#111' },
  genres: ['Electronic'],
  explicit: false,
  version: 'original',
  credits: [],
  durationSec: 24,
  audioKind: 'synth',
  synthSeed: 220,
  status: 'published',
  eligibleForDiscovery: true,
});

describe('PlaybackEngine synth teardown', () => {
  beforeEach(() => {
    oscillators.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
    });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      globalThis.setTimeout(() => cb(0), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => globalThis.clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not stop the next track’s oscillators when skipping within the fade window', async () => {
    const engine = new PlaybackEngine();
    await engine.loadAndPlay(synthSong('a'));
    const firstWave = oscillators.slice();
    // lfo + 3 pad voices; ignore the one-shot pluck
    expect(firstWave.length).toBeGreaterThanOrEqual(4);
    expect(firstWave.slice(0, 4).every((o) => !o.stopped)).toBe(true);

    await engine.loadAndPlay(synthSong('b'));
    const secondWave = oscillators.slice(firstWave.length);
    expect(secondWave.length).toBeGreaterThanOrEqual(4);

    vi.advanceTimersByTime(180);

    expect(firstWave.slice(0, 4).every((o) => o.stopped)).toBe(true);
    expect(secondWave.slice(0, 4).every((o) => !o.stopped)).toBe(true);

    engine.dispose();
  });
});
