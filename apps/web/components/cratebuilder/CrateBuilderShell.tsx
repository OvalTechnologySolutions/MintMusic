'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Tab =
  | 'dashboard'
  | 'artists'
  | 'review'
  | 'sources'
  | 'import'
  | 'runs'
  | 'exports';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/cratebuilder/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

export function CrateBuilderShell({ userEmail }: { userEmail: string }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [artists, setArtists] = useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [review, setReview] = useState<Array<Record<string, unknown>>>([]);
  const [sources, setSources] = useState<Array<Record<string, unknown>>>([]);
  const [connectors, setConnectors] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [exportsList, setExportsList] = useState<Array<Record<string, unknown>>>([]);
  const [q, setQ] = useState('');
  const [importText, setImportText] = useState(
    '[{"stageName":"Example Artist","website":"https://example.com","genres":["indie"]}]'
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshDashboard = useCallback(async () => {
    const d = await api<Record<string, unknown>>('dashboard');
    setDashboard(d);
  }, []);

  const refreshArtists = useCallback(async () => {
    const data = await api<{ artists: Array<Record<string, unknown>> }>(
      `artists?q=${encodeURIComponent(q)}&limit=50`
    );
    setArtists(data.artists);
  }, [q]);

  const loadTab = useCallback(
    async (t: Tab) => {
      setMessage(null);
      setBusy(true);
      try {
        if (t === 'dashboard') await refreshDashboard();
        if (t === 'artists') await refreshArtists();
        if (t === 'review') {
          const data = await api<{ items: Array<Record<string, unknown>> }>('review');
          setReview(data.items);
        }
        if (t === 'sources') {
          const [s, c] = await Promise.all([
            api<{ sources: Array<Record<string, unknown>> }>('sources'),
            api<{ connectors: Array<Record<string, unknown>> }>('connectors'),
          ]);
          setSources(s.sources);
          setConnectors(c.connectors);
        }
        if (t === 'runs') {
          const data = await api<{ runs: Array<Record<string, unknown>> }>('runs');
          setRuns(data.runs);
        }
        if (t === 'exports') {
          const data = await api<{ exports: Array<Record<string, unknown>> }>('exports');
          setExportsList(data.exports);
        }
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setBusy(false);
      }
    },
    [refreshArtists, refreshDashboard]
  );

  useEffect(() => {
    void loadTab(tab);
  }, [tab, loadTab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'artists', label: 'Artists' },
    { id: 'review', label: 'Review' },
    { id: 'sources', label: 'Sources' },
    { id: 'import', label: 'Import' },
    { id: 'runs', label: 'Runs' },
    { id: 'exports', label: 'Exports' },
  ];

  return (
    <main className="min-h-svh bg-[radial-gradient(ellipse_at_top,_#1a2420_0%,_var(--mm-onyx)_55%)] text-[var(--mm-paper)]">
      <header className="border-b border-white/10 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mm-mint-soft)]/80">
            MintMusic internal
          </p>
          <h1 className="font-[family-name:var(--font-urbanist)] text-3xl font-semibold tracking-tight">
            CrateBuilder
          </h1>
          <p className="mt-1 text-sm text-white/55">Signed in as {userEmail}</p>
        </div>
        <Link href="/" className="text-sm text-[var(--mm-mint-soft)] hover:underline">
          ← Back to MintMusic
        </Link>
      </header>

      <nav className="px-6 pt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-2 text-sm transition ${
              tab === t.id
                ? 'bg-[var(--mm-mint)] text-[var(--mm-onyx)] font-medium'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="px-6 py-6 max-w-6xl">
        {message && (
          <p className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm">
            {message}
          </p>
        )}
        {busy && <p className="mb-4 text-sm text-white/50">Loading…</p>}

        {tab === 'dashboard' && dashboard && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Total artists', dashboard.totalArtists],
              ['New (24h)', dashboard.newArtists24h],
              ['Updated (24h)', dashboard.updatedArtists24h],
              ['Verified contacts', dashboard.verifiedContacts],
              ['Review queue', dashboard.reviewQueueOpen],
              ['Disabled connectors', dashboard.connectorFailures],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
                <p className="mt-2 font-[family-name:var(--font-urbanist)] text-3xl font-semibold text-[var(--mm-mint-soft)]">
                  {String(value ?? 0)}
                </p>
              </div>
            ))}
            {dashboard.lastRun ? (
              <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <p className="text-xs uppercase tracking-wider text-white/45">Last run</p>
                <pre className="mt-2 overflow-auto text-xs text-white/70 whitespace-pre-wrap">
                  {JSON.stringify(dashboard.lastRun, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        )}

        {tab === 'artists' && (
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void refreshArtists();
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search artists"
                className="flex-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--mm-mint)]"
              />
              <button
                type="submit"
                className="rounded-md bg-[var(--mm-mint)] px-4 text-sm font-medium text-[var(--mm-onyx)]"
              >
                Search
              </button>
            </form>
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
              {artists.map((a) => (
                <li key={String(a.id)}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-white/5"
                    onClick={async () => {
                      const data = await api<{ artist: Record<string, unknown> }>(
                        `artists/${a.id}`
                      );
                      setSelected(data.artist);
                    }}
                  >
                    <span className="font-medium">{String(a.stageName)}</span>
                    <span className="ml-2 text-xs text-white/45">
                      {String(a.outreachStatus)} · {String(a.entityType)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <ArtistDetail
                artist={selected}
                onSaved={async () => {
                  const data = await api<{ artist: Record<string, unknown> }>(
                    `artists/${selected.id}`
                  );
                  setSelected(data.artist);
                  await refreshArtists();
                }}
              />
            )}
          </div>
        )}

        {tab === 'review' && (
          <ul className="space-y-3">
            {review.map((item) => (
              <li
                key={String(item.id)}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="font-medium">{String(item.title)}</p>
                <p className="mt-1 text-sm text-white/60">{String(item.detail ?? '')}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-[var(--mm-mint)] px-3 py-1.5 text-sm text-[var(--mm-onyx)]"
                    onClick={async () => {
                      await api(`review/${item.id}/resolve`, {
                        method: 'POST',
                        body: JSON.stringify({ status: 'accepted' }),
                      });
                      await loadTab('review');
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-white/20 px-3 py-1.5 text-sm"
                    onClick={async () => {
                      await api(`review/${item.id}/resolve`, {
                        method: 'POST',
                        body: JSON.stringify({ status: 'rejected' }),
                      });
                      await loadTab('review');
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
            {!review.length && <p className="text-white/50">Review queue is empty.</p>}
          </ul>
        )}

        {tab === 'sources' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-2">Connectors</h2>
              <ul className="space-y-2">
                {connectors.map((c) => (
                  <li
                    key={String(c.id)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      c.enabled
                        ? 'border-[var(--mm-mint)]/40 bg-[var(--mm-mint)]/10'
                        : 'border-white/10 bg-white/[0.02] opacity-70'
                    }`}
                  >
                    <span className="font-medium">{String(c.id)}</span>
                    <span className="ml-2 text-xs">
                      {c.enabled ? 'enabled' : 'disabled'}
                    </span>
                    <p className="mt-1 text-white/55">{String(c.reason ?? '')}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-medium mb-2">Sources</h2>
              <ul className="space-y-2">
                {sources.map((s) => (
                  <li
                    key={String(s.id)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{String(s.name)}</p>
                    <p className="text-white/50 break-all">{String(s.url ?? '')}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {String(s.connectorId)} · {s.enabled ? 'on' : 'off'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'import' && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Paste JSON array or CSV (`stageName,website,genres,instagram,bookingEmail`).
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs outline-none focus:border-[var(--mm-mint)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-[var(--mm-mint)] px-4 py-2 text-sm font-medium text-[var(--mm-onyx)]"
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(importText);
                    const result = await api('import', {
                      method: 'POST',
                      body: JSON.stringify({ format: 'json', data: parsed }),
                    });
                    setMessage(`Import OK: ${JSON.stringify(result)}`);
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : 'Import failed');
                  }
                }}
              >
                Import JSON
              </button>
              <button
                type="button"
                className="rounded-md border border-white/20 px-4 py-2 text-sm"
                onClick={async () => {
                  try {
                    const result = await api('import', {
                      method: 'POST',
                      body: JSON.stringify({ format: 'csv', data: importText }),
                    });
                    setMessage(`Import OK: ${JSON.stringify(result)}`);
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : 'Import failed');
                  }
                }}
              >
                Import CSV
              </button>
            </div>
          </div>
        )}

        {tab === 'runs' && (
          <div className="space-y-4">
            <button
              type="button"
              className="rounded-md bg-[var(--mm-mint)] px-4 py-2 text-sm font-medium text-[var(--mm-onyx)]"
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api('runs', {
                    method: 'POST',
                    body: JSON.stringify({}),
                  });
                  setMessage(`Run started: ${JSON.stringify(result)}`);
                  await loadTab('runs');
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Run failed');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Run now
            </button>
            <ul className="space-y-2">
              {runs.map((r) => (
                <li
                  key={String(r.id)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <p>
                    <span className="font-medium">{String(r.status)}</span>
                    <span className="ml-2 text-white/45">{String(r.trigger)}</span>
                  </p>
                  <p className="text-xs text-white/40">
                    {String(r.startedAt ?? r.createdAt)} → {String(r.completedAt ?? '…')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'exports' && (
          <div className="space-y-4">
            <button
              type="button"
              className="rounded-md bg-[var(--mm-mint)] px-4 py-2 text-sm font-medium text-[var(--mm-onyx)]"
              onClick={async () => {
                const result = await api('exports/generate', {
                  method: 'POST',
                  body: JSON.stringify({}),
                });
                setMessage(`Export created: ${JSON.stringify(result)}`);
                await loadTab('exports');
              }}
            >
              Generate snapshot export
            </button>
            <ul className="space-y-2">
              {exportsList.map((e) => (
                <li
                  key={String(e.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{String(e.filename)}</p>
                    <p className="text-xs text-white/40">
                      {e.complete ? 'complete' : 'PARTIAL'}
                      {e.isLatest ? ' · latest' : ''}
                    </p>
                  </div>
                  <a
                    className="text-[var(--mm-mint-soft)] hover:underline"
                    href={`/api/cratebuilder/exports/${e.id}/download`}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

function ArtistDetail({
  artist,
  onSaved,
}: {
  artist: Record<string, unknown>;
  onSaved: () => Promise<void>;
}) {
  const [notes, setNotes] = useState(String(artist.outreachNotes ?? ''));
  const [status, setStatus] = useState(String(artist.outreachStatus ?? 'not_reviewed'));
  const [visible, setVisible] = useState(Boolean(artist.discoveryVisible));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <h3 className="font-[family-name:var(--font-urbanist)] text-xl font-semibold">
        {String(artist.stageName)}
      </h3>
      <p className="text-sm text-white/60">{String(artist.bio ?? 'No bio')}</p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <label className="block">
          Outreach status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-2"
          >
            {[
              'not_reviewed',
              'ready',
              'contacted',
              'responded',
              'onboarded',
              'do_not_contact',
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Discovery visible
        </label>
      </div>
      <label className="block text-sm">
        Outreach notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-2"
        />
      </label>
      <button
        type="button"
        className="rounded-md bg-[var(--mm-mint)] px-4 py-2 text-sm font-medium text-[var(--mm-onyx)]"
        onClick={async () => {
          await api(`artists/${artist.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              outreachStatus: status,
              outreachNotes: notes,
              discoveryVisible: visible,
            }),
          });
          await onSaved();
        }}
      >
        Save corrections
      </button>
      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        <div>
          <p className="uppercase tracking-wider text-white/40 mb-1">Profiles</p>
          <ul className="space-y-1">
            {((artist.profiles as Array<Record<string, unknown>>) ?? []).map((p) => (
              <li key={String(p.id)}>
                <a
                  href={String(p.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--mm-mint-soft)] hover:underline"
                >
                  {String(p.platform)}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="uppercase tracking-wider text-white/40 mb-1">Contacts</p>
          <ul className="space-y-1">
            {((artist.contacts as Array<Record<string, unknown>>) ?? []).map((c) => (
              <li key={String(c.id)}>
                {String(c.kind)}: {String(c.value)}
                {c.suppressed ? ' (suppressed)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <p className="uppercase tracking-wider text-white/40 mb-1 text-xs">Evidence</p>
        <ul className="max-h-40 overflow-auto space-y-1 text-xs text-white/55">
          {((artist.observations as Array<Record<string, unknown>>) ?? []).map((o) => (
            <li key={String(o.id)}>
              {String(o.field)}={String(o.value).slice(0, 80)} · {String(o.method)} ·{' '}
              {String(o.confidence)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
