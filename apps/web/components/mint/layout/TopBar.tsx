'use client';

import { MintMusicLogo } from '../brand/MintMusicLogo';
import { MintMusicMark } from '../brand/MintMusicMark';
import { SegmentedControl } from '../ui/primitives';

export type AppMode = 'discover' | 'collection' | 'artist';

export function TopBar({
  mode,
  onMode,
  onProfile,
  avatarInitial,
}: {
  mode: AppMode;
  onMode: (m: AppMode) => void;
  onProfile: () => void;
  avatarInitial: string;
}) {
  return (
    <header className="mint-safe-top mint-safe-x sticky top-0 z-30 w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* logo */}
        <div className="flex items-center">
          <span className="hidden sm:block">
            <MintMusicLogo size={26} />
          </span>
          <span className="sm:hidden">
            <MintMusicMark size={30} />
          </span>
        </div>

        {/* modes */}
        <SegmentedControl<AppMode>
          ariaLabel="App mode"
          value={mode}
          onChange={onMode}
          options={[
            { value: 'discover', label: 'Discover' },
            { value: 'collection', label: 'Collection' },
            { value: 'artist', label: 'Artist' },
          ]}
        />

        {/* profile */}
        <button
          onClick={onProfile}
          aria-label="Profile and settings"
          className="mint-focus grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-[#0A0A0B]"
          style={{ background: 'linear-gradient(135deg, var(--mint-primary), var(--mint-deep))' }}
        >
          {avatarInitial}
        </button>
      </div>
    </header>
  );
}
