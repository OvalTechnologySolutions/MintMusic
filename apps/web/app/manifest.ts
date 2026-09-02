import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MintMusic',
    short_name: 'MintMusic',
    description: 'Discover music as spinning vinyl. Swipe to collect.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    icons: [
      { src: '/brand/mintmusic-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/mintmusic-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' },
    ],
  };
}
