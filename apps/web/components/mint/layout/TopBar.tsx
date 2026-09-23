'use client';

import { MintMusicLogo } from '../brand/MintMusicLogo';
import { MintMusicMark } from '../brand/MintMusicMark';
import { formatMint } from '../lib/billing-api';
import { SegmentedControl } from '../ui/primitives';

export type AppMode = 'discover' | 'collection' | 'artist';

export function TopBar({
  mode,
  onMode,
  onProfile,
  onWallet,
  avatarInitial,
  balanceUnits,
}: {
  mode: AppMode;
  onMode: (m: AppMode) => void;
  onProfile: () => void;
  onWallet?: () => void;
  avatarInitial: string;
  balanceUnits?: number | null;
}) {
  return (
    <header className="mint-safe-top mint-safe-x sticky top-0 z-30 w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center">
          <span className="hidden sm:block">
            <MintMusicLogo size={26} />
          </span>
          <span className="sm:hidden">
            <MintMusicMark size={30} />
          </span>
        </div>

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

        <div className="flex items-center gap-2">
          {typeof balanceUnits === 'number' && onWallet && (
            <button
              onClick={onWallet}
              aria-label="Mint wallet balance"
              className="mint-focus hidden min-h-[36px] items-center rounded-full px-3 text-[12px] font-semibold sm:flex"
              style={{
                background: 'rgba(127, 233, 188, 0.12)',
                color: 'var(--mint-primary)',
                border: '1px solid rgba(127, 233, 188, 0.25)',
              }}
            >
              {formatMint(balanceUnits)} Mint
            </button>
          )}
          <button
            onClick={onProfile}
            aria-label="Profile and settings"
            className="mint-focus grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-bold text-[#0A0A0B]"
            style={{ background: 'linear-gradient(135deg, var(--mint-primary), var(--mint-deep))' }}
          >
            {avatarInitial}
          </button>
        </div>
      </div>
    </header>
  );
}
