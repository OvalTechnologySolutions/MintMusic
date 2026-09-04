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
    return Promise.resolve();
  }

  pause() {}

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

function synthSong(id: string): Song {
  return {
    ...fileSong(id),
    audioKind: 'synth',
    audioUrl: undefined,
  };
}

describe('PlaybackEngine file-load teardown', () => {
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

  it('does not mark the next track as error when a torn-down file element fires error', async () => {
    const engine = new PlaybackEngine();
    const states: PlaybackState[] = [];
    engine.onState((s) => states.push(s));

    const pendingFile = engine.loadAndPlay(fileSong('upload'));
    expect(audioElements).toHaveLength(1);
    audioElements[0].dispatch('canplaythrough');
    await pendingFile;
    expect(engine.currentState).toBe('playing');

    await engine.loadAndPlay(synthSong('seed'));
    expect(engine.currentState).toBe('playing');
    expect(engine.currentSong?.id).toBe('seed');

    // Browsers fire `error` when teardown clears the previous element's src.
    audioElements[0].dispatch('error');

    expect(engine.currentState).toBe('playing');
    expect(engine.currentSong?.id).toBe('seed');
    expect(states.at(-1)).toBe('playing');
    expect(states).not.toContain('error');

    engine.dispose();
  });

  it('does not let a stale in-flight file load pause or replay the next track', async () => {
    const engine = new PlaybackEngine();

    const pendingFile = engine.loadAndPlay(fileSong('upload'));
    expect(audioElements).toHaveLength(1);

    await engine.loadAndPlay(synthSong('seed'));
    expect(engine.currentState).toBe('playing');
    expect(engine.currentSong?.id).toBe('seed');

    audioElements[0].dispatch('canplaythrough');
    audioElements[0].dispatch('error');
    await pendingFile;

    expect(engine.currentState).toBe('playing');
    expect(engine.currentSong?.id).toBe('seed');

    engine.dispose();
  });

  it('still reports error when the active file fails to load', async () => {
    const engine = new PlaybackEngine();
    const pending = engine.loadAndPlay(fileSong('broken'));
    expect(audioElements).toHaveLength(1);
    audioElements[0].dispatch('error');
    await pending;

    expect(engine.currentState).toBe('error');
    expect(engine.currentSong?.id).toBe('broken');

    engine.dispose();
  });
});
