'use client';

import { useMemo, useState } from 'react';
import { usePlayback } from '../lib/playback';
import { useMint } from '../lib/store';
import type { Song } from '../lib/types';
import { RecordSleeve } from '../collection/RecordSleeve';
import { Button } from '../ui/primitives';
import { UploadReleaseSheet } from './UploadReleaseSheet';

export function ArtistExperience({
  publicSlug,
  uploadOpen,
  onUploadOpenChange,
}: {
  publicSlug?: string | null;
  uploadOpen: boolean;
  onUploadOpenChange: (open: boolean) => void;
}) {
  const { artist, enableArtist, uploads, publishSong, catalog, collect, isCollected } = useMint();
  const playback = usePlayback();
  const [stageNameDraft, setStageNameDraft] = useState('');

  const ownerView = !publicSlug;

  // Public artist page (viewing someone else's homepage from Discover)
  const publicSongs = useMemo<Song[]>(
    () => (publicSlug ? catalog.filter((s) => s.artistSlug === publicSlug) : []),
    [publicSlug, catalog],
  );
  const publicName = publicSongs[0]?.artist ?? 'Artist';

  if (!ownerView) {
    return (
      <div className="w-full max-w-3xl">
        <ArtistHeader name={publicName} bio="" genres={publicSongs.flatMap((s) => s.genres).slice(0, 4)} />
        <Discography
          songs={publicSongs}
          onPlay={(s) => void playback.loadAndPlay(s)}
          activeId={playback.currentSongId}
          collectable
          onCollect={(s) => collect(s)}
          isCollected={isCollected}
          emptyLabel="This artist has no published records yet."
        />
      </div>
    );
  }

  if (!artist.enabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div>
          <p className="text-[20px] font-bold text-white">Release music on MintMusic</p>
          <p className="mx-auto mt-2 max-w-sm text-[14px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Put your music in the crate. Turn on your Artist Profile to publish records into Discover.
          </p>
        </div>
        <input
          value={stageNameDraft}
          onChange={(e) => setStageNameDraft(e.target.value)}
          placeholder="Your stage name"
          className="mint-focus w-full max-w-xs rounded-xl bg-transparent px-4 py-3 text-center text-[15px] text-white"
          style={{ border: '1px solid rgba(255,255,255,0.14)' }}
        />
        <Button variant="primary" onClick={() => enableArtist(stageNameDraft.trim() || 'New Artist')}>
          Enable Artist Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <ArtistHeader
        name={artist.stageName || 'Your Artist Name'}
        bio={artist.bio}
        genres={artist.genres}
        imageUrl={artist.imageUrl}
        action={<Button variant="primary" onClick={() => onUploadOpenChange(true)}>Upload</Button>}
      />
      <Discography
        songs={uploads}
        onPlay={(s) => void playback.loadAndPlay(s)}
        activeId={playback.currentSongId}
        emptyLabel="No records yet. Upload your first release."
      />
      <UploadReleaseSheet
        open={uploadOpen}
        onClose={() => onUploadOpenChange(false)}
        artistName={artist.stageName || 'New Artist'}
        onPublished={(song) => publishSong(song)}
      />
    </div>
  );
}

function ArtistHeader({
  name,
  bio,
  genres,
  imageUrl,
  action,
}: {
  name: string;
  bio: string;
  genres: string[];
  imageUrl?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center gap-5">
      <div
        className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full text-2xl font-bold text-[#0A0A0B]"
        style={{ background: 'linear-gradient(135deg, var(--mint-primary), var(--mint-deep))' }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-extrabold tracking-tight text-white">{name}</h1>
        {bio && <p className="mt-1 line-clamp-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{bio}</p>}
        {genres.length > 0 && (
          <p className="mt-1 text-[13px]" style={{ color: 'var(--mint-primary)' }}>
            {Array.from(new Set(genres)).join(' · ')}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Discography({
  songs,
  onPlay,
  activeId,
  emptyLabel,
  collectable,
  onCollect,
  isCollected,
}: {
  songs: Song[];
  onPlay: (s: Song) => void;
  activeId: string | null;
  emptyLabel: string;
  collectable?: boolean;
  onCollect?: (s: Song) => void;
  isCollected?: (id: string) => boolean;
}) {
  if (songs.length === 0) {
    return (
      <div className="rounded-2xl px-6 py-12 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-[15px] text-white/80">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
      {songs.map((song) => (
        <div key={song.id}>
          <RecordSleeve song={song} active={song.id === activeId} onSelect={() => onPlay(song)} />
          {collectable && onCollect && isCollected && (
            <button
              onClick={() => onCollect(song)}
              className="mint-focus mt-1 text-[12px]"
              style={{ color: isCollected(song.id) ? 'rgba(255,255,255,0.4)' : 'var(--mint-primary)' }}
            >
              {isCollected(song.id) ? 'collected ✓' : 'collect →'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
