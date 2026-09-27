import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackEngine, type PlaybackState } from '../components/mint/lib/audio';
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
  start() {}
  stop() {}
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    return new FakeOscillator();
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

type MediaHandler = () => void;

class FakeAudio {
  src: string;
  loop = false;
  crossOrigin = '';
  paused = true;
  private listeners = new Map<string, MediaHandler[]>();

  constructor(src: string) {
    this.src = src;
  }

  addEventListener(type: string, fn: MediaHandler) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  dispatch(type: string) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
}

const audioElements: FakeAudio[] = [];

function fileSong(id: string): Song {
  return {
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
    audioKind: 'file',
    audioUrl: `blob:${id}`,
    synthSeed: 220,
    status: 'published',
    eligibleForDiscovery: true,
  };
}

describe('PlaybackEngine load vs play race', () => {
  beforeEach(() => {
    audioElements.length = 0;
    vi.stubGlobal(
      'Audio',
      class {
        constructor(src: string) {
          const el = new FakeAudio(src);
          audioElements.push(el);
          return el;
        }
      },
    );
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

  it('does not mark a file track paused when play() wins the in-flight load', async () => {
    const engine = new PlaybackEngine();
    const states: PlaybackState[] = [];
    engine.onState((s) => states.push(s));

    const pendingLoad = engine.load(fileSong('upload'));
    expect(engine.currentState).toBe('loading');
    expect(audioElements).toHaveLength(1);

    await engine.play();
    expect(engine.currentState).toBe('playing');
    expect(audioElements[0].paused).toBe(false);

    audioElements[0].dispatch('canplaythrough');
    await pendingLoad;

    expect(engine.currentState).toBe('playing');
    expect(audioElements[0].paused).toBe(false);
    expect(states.at(-1)).toBe('playing');

    engine.dispose();
  });

  it('still settles to paused when the user never starts playback', async () => {
    const engine = new PlaybackEngine();

    const pendingLoad = engine.load(fileSong('upload'));
    audioElements[0].dispatch('canplaythrough');
    await pendingLoad;

    expect(engine.currentState).toBe('paused');
    expect(audioElements[0].paused).toBe(true);

    engine.dispose();
  });
});
