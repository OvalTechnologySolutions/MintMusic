import type { Song } from './types';

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'error'
  | 'complete';

type StateListener = (state: PlaybackState) => void;
type ProgressListener = (fraction: number) => void;

const SCALE = [0, 3, 5, 7, 10, 12, 10, 7]; // minor-pentatonic-ish arp pattern

/**
 * One persistent audio engine for the whole app.
 * - Seed songs are synthesized (a warm pad + gentle arpeggio) via Web Audio.
 * - Uploaded songs ('file') play their real audio through an <audio> element.
 * The AudioContext is created lazily on the first user gesture (iOS autoplay).
 */
export class PlaybackEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private song: Song | null = null;
  private state: PlaybackState = 'idle';

  // synth graph
  private pad: OscillatorNode[] = [];
  private padGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private arpTimer: number | null = null;
  private arpStep = 0;
  private startedAt = 0;

  // file graph
  private audioEl: HTMLAudioElement | null = null;

  private raf: number | null = null;
  private stateListeners = new Set<StateListener>();
  private progressListeners = new Set<ProgressListener>();

  get currentState(): PlaybackState {
    return this.state;
  }
  get currentSong(): Song | null {
    return this.song;
  }

  onState(cb: StateListener): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }
  onProgress(cb: ProgressListener): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  private setState(s: PlaybackState) {
    this.state = s;
    this.stateListeners.forEach((cb) => cb(s));
  }
  private emitProgress(f: number) {
    this.progressListeners.forEach((cb) => cb(f));
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Load a song (does not start playback). */
  async load(song: Song): Promise<void> {
    this.teardown();
    this.song = song;
    this.setState('loading');

    if (song.audioKind === 'file' && song.audioUrl) {
      const el = new Audio(song.audioUrl);
      el.loop = true;
      el.crossOrigin = 'anonymous';
      this.audioEl = el;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        el.addEventListener('canplaythrough', done, { once: true });
        el.addEventListener('loadeddata', done, { once: true });
        el.addEventListener('error', () => {
          this.setState('error');
          resolve();
        }, { once: true });
        // Safety timeout so we never hang on load.
        window.setTimeout(done, 1500);
      });
    }

    if (this.state !== 'error') this.setState('paused');
  }

  async play(): Promise<void> {
    if (!this.song) return;
    const ctx = this.ensureCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    if (this.song.audioKind === 'file' && this.audioEl) {
      try {
        await this.audioEl.play();
      } catch {
        this.setState('error');
        return;
      }
    } else {
      this.startSynth();
    }
    this.startProgressLoop();
    this.setState('playing');
  }

  pause(): void {
    if (this.audioEl) this.audioEl.pause();
    this.stopSynth();
    this.stopProgressLoop();
    if (this.song) this.setState('paused');
  }

  async toggle(): Promise<void> {
    if (this.state === 'playing') this.pause();
    else await this.play();
  }

  /** Load and immediately attempt to play (used when a new record lands). */
  async loadAndPlay(song: Song): Promise<void> {
    await this.load(song);
    await this.play();
  }

  private startSynth() {
    const ctx = this.ensureCtx();
    const root = this.song?.synthSeed ?? 220;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 5;
    filter.connect(this.master!);
    this.filter = filter;

    // moving filter via slow LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.lfo = lfo;

    // warm pad: root, fifth, octave
    const padGain = ctx.createGain();
    padGain.gain.value = 0.0;
    padGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.6);
    padGain.connect(filter);
    this.padGain = padGain;

    [1, 1.5, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = root * mult;
      osc.detune.value = (i - 1) * 4;
      osc.connect(padGain);
      osc.start();
      this.pad.push(osc);
    });

    this.arpStep = 0;
    this.startedAt = ctx.currentTime;
    const stepMs = 300;
    this.arpTimer = window.setInterval(() => this.pluck(root), stepMs);
    this.pluck(root);
  }

  private pluck(root: number) {
    const ctx = this.ctx;
    if (!ctx || !this.filter) return;
    const semi = SCALE[this.arpStep % SCALE.length];
    this.arpStep += 1;
    const freq = root * 2 * Math.pow(2, semi / 12);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(this.filter);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  private stopSynth() {
    if (this.arpTimer !== null) {
      window.clearInterval(this.arpTimer);
      this.arpTimer = null;
    }
    const ctx = this.ctx;
    // Snapshot the current graph so a later load/play can start a new synth
    // without the fade-out timeout tearing it down (skip / collect / next track).
    const pad = this.pad.splice(0);
    const lfo = this.lfo;
    const filter = this.filter;
    const padGain = this.padGain;
    this.lfo = null;
    this.filter = null;
    this.padGain = null;

    if (padGain && ctx) {
      padGain.gain.cancelScheduledValues(ctx.currentTime);
      padGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    }
    window.setTimeout(() => {
      pad.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      try {
        lfo?.stop();
      } catch {
        /* noop */
      }
      filter?.disconnect();
      padGain?.disconnect();
    }, 180);
  }

  private startProgressLoop() {
    const dur = this.song?.durationSec ?? 24;
    const startPerf = performance.now();
    const tick = () => {
      let f: number;
      if (this.audioEl && this.audioEl.duration) {
        f = this.audioEl.currentTime / this.audioEl.duration;
      } else {
        f = ((performance.now() - startPerf) / 1000 / dur) % 1;
      }
      this.emitProgress(f);
      this.raf = requestAnimationFrame(tick);
    };
    this.stopProgressLoop();
    this.raf = requestAnimationFrame(tick);
  }

  private stopProgressLoop() {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  private teardown() {
    this.stopSynth();
    this.stopProgressLoop();
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = '';
      this.audioEl = null;
    }
    this.emitProgress(0);
  }

  dispose() {
    this.teardown();
    this.stateListeners.clear();
    this.progressListeners.clear();
    if (this.ctx) {
      this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
