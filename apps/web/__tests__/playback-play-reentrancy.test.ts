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
  connect() {
    return this;
  }
  disconnect() {}
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
const resumeWaiters: Array<() => void> = [];

class FakeAudioContext {
  currentTime = 0;
  state = 'suspended';
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
    return new Promise<void>((resolve) => {
      resumeWaiters.push(() => {
        this.state = 'running';
        resolve();
      });
    });
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

function flushResume() {
  const waiters = resumeWaiters.splice(0);
  for (const resume of waiters) resume();
}

describe('PlaybackEngine.play reentrancy', () => {
  beforeEach(() => {
    oscillators.length = 0;
    resumeWaiters.length = 0;
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
    vi.unstubAllGlobals();
  });

  it('starts a single synth graph on the first play gesture', async () => {
    const engine = new PlaybackEngine();
    await engine.load(synthSong('seed'));

    const pending = engine.play();
    flushResume();
    await pending;

    expect(oscillators.length).toBe(5);
    expect(engine.currentState).toBe('playing');

    engine.dispose();
  });

  it('does not stack a second synth graph when play is invoked twice while AudioContext is suspended', async () => {
    const engine = new PlaybackEngine();
    await engine.load(synthSong('seed'));

    const first = engine.play();
    const second = engine.toggle();
    expect(resumeWaiters.length).toBeGreaterThan(0);

    flushResume();
    await Promise.all([first, second]);

    // One graph: LFO + 3 pad voices + the initial pluck.
    expect(oscillators.length).toBe(5);
    expect(engine.currentState).toBe('playing');
    expect(oscillators.slice(0, 4).every((o) => !o.stopped)).toBe(true);

    engine.dispose();
  });

  it('does not let an in-flight first-play start the previous song after skip', async () => {
    const engine = new PlaybackEngine();
    await engine.load(synthSong('a'));

    const stalePlay = engine.play();
    expect(resumeWaiters.length).toBe(1);

    const next = engine.loadAndPlay(synthSong('b'));
    flushResume();
    await Promise.all([stalePlay, next]);

    expect(engine.currentSong?.id).toBe('b');
    expect(engine.currentState).toBe('playing');
    // Only the post-skip graph should be live (not A+B stacked).
    expect(oscillators.length).toBe(5);

    engine.dispose();
  });
});
