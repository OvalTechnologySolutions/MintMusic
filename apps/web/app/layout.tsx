import type { Metadata } from "next";
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
  title: {
    default: 'MintMusic — The digital record collection',
    template: '%s | MintMusic',
  },
  description:
    'Collect music you love, keep every edition close, and support the artists who made it.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://mintmusic.ai'),
  openGraph: {
    siteName: 'MintMusic',
    type: 'website',
  },
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
