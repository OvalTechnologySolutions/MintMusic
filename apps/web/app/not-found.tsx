import Link from 'next/link';
import { MintMusicLogo } from '@/components/mint/brand/MintMusicLogo';

export default function NotFound() {
  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: 'var(--onyx)', color: 'var(--paper-white)' }}
    >
      <MintMusicLogo size={34} variant="dark" />
      <div>
        <p className="text-5xl font-extrabold" style={{ color: 'var(--mint-primary)' }}>
          404
        </p>
        <h1 className="mt-3 text-xl font-bold">This record isn’t in the crate.</h1>
        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          The page you’re looking for doesn’t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="mint-focus rounded-full px-6 py-3 text-[15px] font-semibold"
        style={{ background: 'var(--mint-primary)', color: '#0A0A0B' }}
      >
        Back to MintMusic
      </Link>
    </main>
  );
}
