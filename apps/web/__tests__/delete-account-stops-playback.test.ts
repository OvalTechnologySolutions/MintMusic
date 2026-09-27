import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackEngine } from '../components/mint/lib/audio';
import {
  haltPlaybackIfSignedOut,
  sessionRequiresSilentEngine,
} from '../components/mint/lib/session-playback';
import type { MintSession, Song } from '../components/mint/lib/types';

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
let intervalCount = 0;

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

const session: MintSession = {
  email: 'listener@mintmusic.app',
  name: 'Listener',
  provider: 'google',
};

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

describe('sessionRequiresSilentEngine', () => {
  it('is silent only after hydration when no mint session remains', () => {
    expect(sessionRequiresSilentEngine(false, null)).toBe(false);
    expect(sessionRequiresSilentEngine(false, session)).toBe(false);
    expect(sessionRequiresSilentEngine(true, session)).toBe(false);
    expect(sessionRequiresSilentEngine(true, null)).toBe(true);
  });
});

describe('haltPlaybackIfSignedOut', () => {
  it('does not pause while a session is still present', () => {
    const pause = vi.fn();
    expect(haltPlaybackIfSignedOut(true, session, pause)).toBe(false);
    expect(pause).not.toHaveBeenCalled();
  });

  it('pauses when Delete account / sign-out clears the session', () => {
    const pause = vi.fn();
    expect(haltPlaybackIfSignedOut(true, null, pause)).toBe(true);
    expect(pause).toHaveBeenCalledOnce();
  });
});

describe('PlaybackEngine after session wipe', () => {
  beforeEach(() => {
    oscillators.length = 0;
    intervalCount = 0;
    vi.stubGlobal('window', {
      AudioContext: FakeAudioContext,
      webkitAudioContext: FakeAudioContext,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      setInterval: (fn: TimerHandler, ms?: number) => {
        intervalCount += 1;
        return globalThis.setInterval(fn, ms);
      },
      clearInterval: (id: number) => {
        intervalCount = Math.max(0, intervalCount - 1);
        globalThis.clearInterval(id);
      },
    });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      globalThis.setTimeout(() => cb(0), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => globalThis.clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops a playing seed track when the session-clear halt runs', async () => {
    const engine = new PlaybackEngine();
    await engine.loadAndPlay(synthSong('seed'));
    expect(engine.currentState).toBe('playing');
    expect(intervalCount).toBeGreaterThan(0);

    haltPlaybackIfSignedOut(true, null, () => engine.pause());

    expect(engine.currentState).toBe('paused');
    expect(intervalCount).toBe(0);

    engine.dispose();
  });
});
