'use client';

import { useRef, useState } from 'react';
import { track } from '../lib/analytics';
import { GENRES, CREDIT_ROLES } from '../lib/types';
import type { CreditRole, Genre, Song, SongCredit, SongVersion } from '../lib/types';
import { Button, Chip, Sheet } from '../ui/primitives';

type UploadStage =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'optimizing'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'error';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const VERSIONS: SongVersion[] = ['original', 'remix', 'acoustic', 'live', 'demo', 'other'];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'artist';

function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = new Audio(url);
    el.addEventListener('loadedmetadata', () => resolve(el.duration || 24), { once: true });
    el.addEventListener('error', () => resolve(24), { once: true });
    window.setTimeout(() => resolve(24), 1500);
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function UploadReleaseSheet({
  open,
  onClose,
  artistName,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  artistName: string;
  onPublished: (song: Song) => void;
}) {
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [version, setVersion] = useState<SongVersion>('original');
  const [explicit, setExplicit] = useState(false);
  const [isrc, setIsrc] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [credits, setCredits] = useState<SongCredit[]>([{ role: 'Primary Artist', name: artistName }]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioInput = useRef<HTMLInputElement>(null);
  const artInput = useRef<HTMLInputElement>(null);

  const toggleGenre = (g: Genre) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const onAudioPick = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!/(audio\/(mpeg|mp3|wav|x-wav|wave))/.test(f.type) && !/\.(mp3|wav)$/i.test(f.name)) {
      setError('Audio must be an .mp3 or .wav file.');
      return;
    }
    if (f.size > MAX_AUDIO_BYTES) {
      setError('Audio file is too large (max 50MB).');
      return;
    }
    setAudioFile(f);
  };

  const onArtPick = async (f: File | null) => {
    setError(null);
    if (!f) return;
    if (f.type !== 'image/png' && !/\.png$/i.test(f.name)) {
      setError('Artwork must be a PNG.');
      return;
    }
    setArtFile(f);
    setArtPreview(await readDataUrl(f));
  };

  const reset = () => {
    setTitle('');
    setGenres([]);
    setVersion('original');
    setExplicit(false);
    setIsrc('');
    setReleaseDate('');
    setNotes('');
    setCredits([{ role: 'Primary Artist', name: artistName }]);
    setAudioFile(null);
    setArtFile(null);
    setArtPreview(null);
    setStage('idle');
    setProgress(0);
    setError(null);
  };

  const canPublish = title.trim() && genres.length > 0 && audioFile && artFile && stage !== 'publishing';

  const runStage = (s: UploadStage, ms: number) =>
    new Promise<void>((resolve) => {
      setStage(s);
      window.setTimeout(resolve, ms);
    });

  const handlePublish = async () => {
    if (!audioFile || !artFile) {
      setError('Add both an audio file and PNG artwork.');
      return;
    }
    if (!title.trim() || genres.length === 0) {
      setError('Title and at least one genre are required.');
      return;
    }
    track('song_upload_started');
    setError(null);
    try {
      await runStage('validating', 350);
      const audioUrl = URL.createObjectURL(audioFile);
      const duration = await readDuration(audioUrl);
      // simulate upload progress (real impl → Supabase storage)
      setStage('uploading');
      for (let p = 0; p <= 100; p += 20) {
        setProgress(p);
        await new Promise((r) => setTimeout(r, 90));
      }
      await runStage('processing', 300);
      await runStage('optimizing', 300);
      await runStage('ready', 200);
      track('song_upload_completed');

      await runStage('publishing', 350);
      const artUrl = artPreview ?? (await readDataUrl(artFile));
      const song: Song = {
        id: `up-${Date.now()}`,
        title: title.trim(),
        artist: artistName,
        artistSlug: slugify(artistName),
        artwork: { from: '#7FE9BC', to: '#0A0A0B', imageUrl: artUrl },
        genres,
        releaseDate: releaseDate || undefined,
        explicit,
        isrc: isrc || undefined,
        version,
        notes: notes || undefined,
        credits: credits.filter((c) => c.name.trim()),
        durationSec: Math.round(duration),
        audioKind: 'file',
        audioUrl,
        synthSeed: 220,
        status: 'published',
        eligibleForDiscovery: true,
        uploadedByUser: true,
      };
      onPublished(song);
      setStage('published');
      window.setTimeout(() => {
        reset();
        onClose();
      }, 900);
    } catch {
      setStage('error');
      setError('Something went wrong. Your details are preserved — try publishing again.');
    }
  };

  const stageLabel: Record<UploadStage, string> = {
    idle: '',
    validating: 'Validating…',
    uploading: `Uploading audio… ${progress}%`,
    processing: 'Processing audio…',
    optimizing: 'Optimizing artwork…',
    ready: 'Ready',
    publishing: 'Publishing…',
    published: 'Published ✓ eligible for Discovery',
    error: 'Upload error',
  };

  return (
    <Sheet open={open} onClose={onClose} title="Upload a release" side="bottom" labelledBy="upload-title">
      {error && (
        <div className="mb-4 rounded-lg px-4 py-3 text-[13px]" style={{ background: 'rgba(220,80,80,0.15)', color: '#ffb4b4' }}>
          {error}
        </div>
      )}

      {/* Audio */}
      <label className="mb-2 block text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Audio (.mp3 / .wav)
      </label>
      <input
        ref={audioInput}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        className="hidden"
        onChange={(e) => onAudioPick(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={() => audioInput.current?.click()}
        className="mint-focus mb-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[14px]"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.18)' }}
      >
        <span className={audioFile ? 'text-white' : 'text-white/50'}>
          {audioFile ? audioFile.name : 'Choose audio file'}
        </span>
        <span style={{ color: 'var(--mint-primary)' }}>{audioFile ? 'Change' : 'Browse'}</span>
      </button>

      {/* Artwork */}
      <label className="mb-2 block text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Artwork (PNG, 1:1)
      </label>
      <input ref={artInput} type="file" accept=".png,image/png" className="hidden" onChange={(e) => void onArtPick(e.target.files?.[0] ?? null)} />
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => artInput.current?.click()}
          className="mint-focus grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg text-[12px] text-white/50"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.18)' }}
        >
          {artPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artPreview} alt="Artwork preview" className="h-full w-full object-cover" />
          ) : (
            '+ PNG'
          )}
        </button>
        <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Square cover art. Optimized copies are generated automatically.
        </p>
      </div>

      {/* Title */}
      <Field label="Song title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="mint-focus w-full rounded-xl bg-transparent px-4 py-3 text-[15px] text-white"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </Field>

      {/* Genre */}
      <Field label="Genre (at least one)">
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Chip key={g} label={g} selected={genres.includes(g)} onClick={() => toggleGenre(g)} />
          ))}
        </div>
      </Field>

      {/* Version + explicit */}
      <div className="flex flex-wrap gap-4">
        <Field label="Version">
          <select
            value={version}
            onChange={(e) => setVersion(e.target.value as SongVersion)}
            className="mint-focus rounded-xl bg-[#17181b] px-4 py-3 text-[14px] text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {VERSIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Explicit">
          <div className="flex gap-2 pt-1">
            <Chip label="No" selected={!explicit} onClick={() => setExplicit(false)} />
            <Chip label="Yes" selected={explicit} onClick={() => setExplicit(true)} />
          </div>
        </Field>
      </div>

      {/* Optional metadata */}
      <div className="flex flex-wrap gap-4">
        <Field label="Release date (optional)">
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="mint-focus rounded-xl bg-transparent px-4 py-3 text-[14px] text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' }}
          />
        </Field>
        <Field label="ISRC (optional)">
          <input
            value={isrc}
            onChange={(e) => setIsrc(e.target.value)}
            placeholder="US-XXX-YY-NNNNN"
            className="mint-focus rounded-xl bg-transparent px-4 py-3 text-[14px] text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </Field>
      </div>

      {/* Credits */}
      <Field label="Credits">
        <div className="space-y-2">
          {credits.map((c, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={c.role}
                onChange={(e) =>
                  setCredits((prev) => prev.map((x, j) => (j === i ? { ...x, role: e.target.value as CreditRole } : x)))
                }
                className="mint-focus rounded-xl bg-[#17181b] px-3 py-2.5 text-[13px] text-white"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {CREDIT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                value={c.name}
                onChange={(e) =>
                  setCredits((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
                placeholder="Name"
                className="mint-focus flex-1 rounded-xl bg-transparent px-3 py-2.5 text-[13px] text-white"
                style={{ border: '1px solid rgba(255,255,255,0.12)' }}
              />
              {credits.length > 1 && (
                <button
                  onClick={() => setCredits((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove credit"
                  className="mint-focus px-2 text-white/50"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setCredits((prev) => [...prev, { role: 'Producer', name: '' }])}
            className="mint-focus text-[13px]"
            style={{ color: 'var(--mint-primary)' }}
          >
            + Add credit
          </button>
        </div>
      </Field>

      {/* Notes */}
      <Field label="Tell listeners something about this record.">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Song story, production notes, inspiration…"
          className="mint-focus w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[14px] text-white"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        />
      </Field>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={handlePublish} disabled={!canPublish}>
          {stage === 'publishing' ? 'Publishing…' : 'Publish release'}
        </Button>
        {stage !== 'idle' && (
          <span
            className="text-[13px]"
            style={{ color: stage === 'error' ? '#ffb4b4' : stage === 'published' ? 'var(--mint-primary)' : 'rgba(255,255,255,0.6)' }}
          >
            {stageLabel[stage]}
          </span>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-[12px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}
