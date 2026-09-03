import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Urbanist, Work_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "../providers";
import NativeAppBridge from "./components/NativeAppBridge";

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

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  applicationName: 'MintMusic',
  title: {
    default: 'MintMusic — hear it fresh.',
    template: '%s | MintMusic',
  },
  description:
    'Discover music as spinning vinyl. Swipe left to skip, swipe right to collect.',
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
        className={`${urbanist.variable} ${workSans.variable} ${plexMono.variable} ${manrope.variable} antialiased`}
      >
        <Providers>
          <NativeAppBridge />
          {children}
        </Providers>
      </body>
    </html>
  );
}
