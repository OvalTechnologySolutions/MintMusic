'use client';

import {
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform,
} from 'motion/react';
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Song } from '../lib/types';
import { VinylRecord } from '../player/VinylRecord';

export interface SwipeHandle {
  skip: () => void;
  collect: () => void;
}

const COMMIT_DISTANCE_RATIO = 0.25; // > ~25% viewport commits
const VELOCITY_COMMIT = 700;

export const SwipeableRecord = forwardRef<
  SwipeHandle,
  {
    song: Song;
    size: number;
    spinning: boolean;
    reducedMotion: boolean;
    onSkip: () => void;
    onCollect: () => void;
    onTap: () => void;
  }
>(function SwipeableRecord(
  { song, size, spinning, reducedMotion, onSkip, onCollect, onTap },
  ref,
) {
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  const sleeveControls = useAnimationControls();
  const [busy, setBusy] = useState(false);
  const [sleeveVisible, setSleeveVisible] = useState(false);

  // subtle tilt: left = counterclockwise, right = clockwise
  const rotate = useTransform(x, [-260, 0, 260], [-9, 0, 9]);
  const skipHint = useTransform(x, [-160, -30, 0], [1, 0.2, 0]);
  const collectHint = useTransform(x, [0, 30, 160], [0, 0.2, 1]);

  const runSkip = async () => {
    if (busy) return;
    setBusy(true);
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    if (reducedMotion) {
      await controls.start({ opacity: 0, transition: { duration: 0.18 } });
    } else {
      // one restrained bounce, then eject left
      await controls.start({ x: 24, rotate: 4, transition: { duration: 0.12 } });
      await controls.start({
        x: -w * 1.15,
        rotate: -16,
        opacity: 0,
        transition: { type: 'spring', stiffness: 220, damping: 26 },
      });
    }
    onSkip();
  };

  const runCollect = async () => {
    if (busy) return;
    setBusy(true);
    if (reducedMotion) {
      await controls.start({ opacity: 0, transition: { duration: 0.2 } });
      onCollect();
      return;
    }
    // 1. lift vertically from spindle
    await controls.start({ y: -size * 0.12, scale: 1.02, transition: { duration: 0.18 } });
    // 2. sleeve emerges behind
    setSleeveVisible(true);
    await sleeveControls.start({ opacity: 1, y: 0, transition: { duration: 0.16 } });
    // 3. vinyl slides into sleeve (shrink) 4-8. sleeve carries it to the shelf (up-right)
    await Promise.all([
      controls.start({
        scale: 0.16,
        y: -size * 0.2,
        opacity: 0.9,
        transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] },
      }),
    ]);
    await sleeveControls.start({
      x: size * 0.5,
      y: -size * 0.55,
      scale: 0.18,
      opacity: 0,
      rotate: 6,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    });
    onCollect();
  };

  useImperativeHandle(ref, () => ({ skip: runSkip, collect: runCollect }));

  const handleDragEnd = (
    _e: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    if (busy) return;
    const w = typeof window !== 'undefined' ? window.innerWidth : 800;
    const threshold = w * COMMIT_DISTANCE_RATIO;
    const { offset, velocity } = info;
    if (offset.x > threshold || velocity.x > VELOCITY_COMMIT) {
      void runCollect();
    } else if (offset.x < -threshold || velocity.x < -VELOCITY_COMMIT) {
      void runSkip();
    } else {
      void controls.start({ x: 0, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } });
    }
  };

  // Distinguish tap from drag
  const downX = useRef(0);
  const onPointerDown = (e: ReactPointerEvent) => {
    downX.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (Math.abs(e.clientX - downX.current) < 6 && !busy) onTap();
  };

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* album sleeve that the record slides into on collect */}
      {sleeveVisible && (
        <motion.div
          className="absolute rounded-lg"
          initial={{ opacity: 0, y: size * 0.1 }}
          animate={sleeveControls}
          style={{
            width: size * 0.9,
            height: size * 0.9,
            zIndex: 0,
            background: `linear-gradient(135deg, ${song.artwork.from} 0%, ${song.artwork.to} 100%)`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {song.artwork.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.artwork.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
          )}
        </motion.div>
      )}

      {/* skip / collect drag hints */}
      <motion.div
        className="pointer-events-none absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
        style={{ opacity: skipHint, background: 'rgba(0,0,0,0.5)', color: 'white' }}
      >
        skip
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
        style={{ opacity: collectHint, background: 'var(--mint-primary)', color: '#0A0A0B' }}
      >
        collect
      </motion.div>

      <motion.div
        drag={busy ? false : 'x'}
        dragElastic={0.65}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        animate={controls}
        style={{ x, rotate, cursor: 'grab', touchAction: 'pan-y', zIndex: 10 }}
        whileTap={{ cursor: 'grabbing' }}
        className="relative"
      >
        <VinylRecord artwork={song.artwork} size={size} spinning={spinning} reducedMotion={reducedMotion} />
      </motion.div>
    </div>
  );
});
