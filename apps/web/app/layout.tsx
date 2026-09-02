import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Urbanist, Work_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  applicationName: 'MintMusic',
  title: {
    default: 'MintMusic — The digital record collection',
    template: '%s | MintMusic',
  },
  description:
    'Collect music you love, keep every edition close, and support the artists who made it.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://mintmusic.ai'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'MintMusic',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    siteName: 'MintMusic',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0A0A0B',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${urbanist.variable} ${workSans.variable} ${plexMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
