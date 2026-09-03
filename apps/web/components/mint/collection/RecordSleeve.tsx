'use client';

import { motion } from 'motion/react';
import type { Song } from '../lib/types';

/** An album sleeve on the shelf, with a subtle vinyl edge peeking out. */
export function RecordSleeve({
  song,
  active,
  onSelect,
}: {
  song: Song;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      className="mint-focus group relative block text-left"
      aria-pressed={active}
      aria-label={`${song.title} by ${song.artist}`}
    >
      {/* vinyl edge */}
      <div
        className="absolute left-[62%] top-1/2 aspect-square w-[72%] -translate-y-1/2 rounded-full transition-transform duration-300 group-hover:translate-x-2"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #1a1a1d 0%, #0a0a0b 70%)',
          border: '1px solid rgba(127,233,188,0.25)',
        }}
      />
      {/* sleeve */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-md"
        style={{
          background: `linear-gradient(135deg, ${song.artwork.from} 0%, ${song.artwork.to} 100%)`,
          boxShadow: active
            ? '0 0 0 2px var(--mint-primary), 0 16px 30px rgba(0,0,0,0.5)'
            : '0 10px 24px rgba(0,0,0,0.45)',
        }}
      >
        {song.artwork.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.artwork.imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold text-white">{song.title}</p>
      <p className="truncate text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {song.artist}
      </p>
    </motion.button>
  );
}
