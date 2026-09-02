import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MintMusic — hear it fresh.',
  description:
    'Drop into a record crate. Hear something fresh. Swipe left if it isn’t yours. Swipe right if it belongs in your collection.',
  applicationName: 'MintMusic',
  appleWebApp: {
    capable: true,
    title: 'MintMusic',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function MintAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${manrope.variable}`}
      style={{ fontFamily: 'var(--font-manrope), system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}
