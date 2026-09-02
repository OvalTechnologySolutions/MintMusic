import Link from 'next/link';
import { getLogoVariantForBackground, type CollectionArtworkTone } from '../lib/logoVariant';
import LandingNav from './LandingNav';
import MintMusicMark from './MintMusicMark';

const pillars = [
  {
    number: '01',
    title: 'Welcoming, never gatekept',
    copy: 'Collecting music should feel like walking into your favorite record shop: curious, personal, and open to everyone.',
  },
  {
    number: '02',
    title: 'Against the current',
    copy: 'Step outside the endless feed. Choose the records that stay with you, and give each one a place of its own.',
  },
  {
    number: '03',
    title: 'Liberating, not extractive',
    copy: 'Your collection celebrates the people who made it. Artists set the terms; fans build something meaningful.',
  },
];

const collectionSteps = [
  ['Discover', 'Find a release through an artist, a friend, or a quiet afternoon of browsing.'],
  ['Listen', 'Spend time with the music before deciding whether it belongs on your shelf.'],
  ['Unlock', 'Choose an available pressing and support the artist directly.'],
  ['Collect', 'Keep the music, artwork, edition details, and story together in your collection.'],
];

type FeaturedCollection = {
  artist: string;
  release: string;
  edition: string;
  artworkClass: string;
  tone: CollectionArtworkTone;
};

const featuredCollections: FeaturedCollection[] = [
  {
    artist: 'Amara Vale',
    release: 'Rooms With The Windows Open',
    edition: 'EDITION 084 / 500',
    artworkClass: 'collection-art--sunroom',
    tone: { luminance: 0.82, warmth: 'warm' },
  },
  {
    artist: 'Northline',
    release: 'After The Last Train',
    edition: 'EDITION 031 / 300',
    artworkClass: 'collection-art--night',
    tone: { luminance: 0.14, warmth: 'cool' },
  },
  {
    artist: 'Milo Saint',
    release: 'Soft Focus',
    edition: 'EDITION 112 / 750',
    artworkClass: 'collection-art--studio',
    tone: { luminance: 0.43, warmth: 'cool' },
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <LandingNav />

      <section className="hero">
        <div className="hero__groove hero__groove--one" aria-hidden="true" />
        <div className="hero__groove hero__groove--two" aria-hidden="true" />
        <div className="mm-shell relative z-10 flex min-h-[100svh] flex-col items-center justify-center pb-16 pt-28 text-center">
          <p className="mm-eyebrow mb-7 text-[var(--mm-mint-soft)]">THE DIGITAL RECORD COLLECTION</p>
          <MintMusicMark variant="core-onyx" decorative className="hero__logo w-full max-w-[34rem]" />
          <h1 className="mt-10 max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            Music you can hold onto.
          </h1>
          <p className="mt-7 max-w-2xl text-balance text-lg leading-8 text-[var(--mm-chrome)] sm:text-xl">
            Build a collection that feels like yours. Keep the records you love close, and help artists make the next one.
          </p>
          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/discover" className="mm-button">
              Start your collection
            </Link>
            <Link href="/#how-it-works" className="mm-button mm-button--ghost">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="mm-section bg-[var(--mm-paper)] text-[var(--mm-ink)]">
        <div className="mm-shell">
          <div className="max-w-3xl">
            <p className="mm-eyebrow mm-eyebrow--rule">01 / WHY MINTMUSIC</p>
            <h2 className="mm-heading mt-7">A home for the music that stays with you.</h2>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
            {pillars.map((pillar) => (
              <article key={pillar.number} className="pillar-card">
                <p className="mm-eyebrow">{pillar.number}</p>
                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.025em]">{pillar.title}</h3>
                <p className="mt-4 text-base leading-7 text-[color:var(--mm-ink-muted)]">{pillar.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mm-section bg-[var(--mm-paper-2)] text-[var(--mm-ink)]">
        <div className="mm-shell grid items-center gap-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-24">
          <div className="mx-auto w-full max-w-md">
            <div className="record-sleeve">
              <span className="record-sleeve__catalog">MM — 002</span>
              <MintMusicMark variant="signature-ivory" markOnly decorative className="w-[82%]" />
              <span className="record-sleeve__note">PLAY IT. KEEP IT. PASS IT ON.</span>
            </div>
          </div>
          <div>
            <p className="mm-eyebrow mm-eyebrow--rule">02 / HOW IT WORKS</p>
            <h2 className="mm-heading mt-7">From first listen to forever favorite.</h2>
            <ol className="mt-12">
              {collectionSteps.map(([title, copy], index) => (
                <li key={title} className="collection-step">
                  <span className="collection-step__number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p className="mt-2 max-w-xl leading-7 text-[color:var(--mm-ink-muted)]">{copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="collections" className="mm-section bg-[var(--mm-paper)] text-[var(--mm-ink)]">
        <div className="mm-shell">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="mm-eyebrow mm-eyebrow--rule">03 / ON THE SHELF</p>
              <h2 className="mm-heading mt-7">New records, made to be kept.</h2>
            </div>
            <Link href="/discover" className="mm-text-link">
              Browse all collections <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {featuredCollections.map((collection) => (
              <article key={collection.release} className="collection-card">
                <div className={`collection-art ${collection.artworkClass}`}>
                  <MintMusicMark
                    variant={getLogoVariantForBackground(collection.tone)}
                    markOnly
                    interactive
                    decorative
                    className="absolute right-4 top-4 w-16 sm:w-[4.5rem]"
                  />
                  <span className="collection-art__type" aria-hidden="true">MM</span>
                </div>
                <div className="p-6">
                  <p className="mm-eyebrow text-[color:var(--mm-ink-muted)]">{collection.edition}</p>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{collection.release}</h3>
                  <p className="mt-1 text-[color:var(--mm-ink-muted)]">{collection.artist}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="identity-section mm-section">
        <div className="mm-shell grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="mm-eyebrow mm-eyebrow--rule text-[var(--mm-mint-soft)]">04 / YOUR COLLECTION</p>
            <h2 className="mm-heading mt-7 text-[var(--mm-white)]">Your taste tells a story.</h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--mm-chrome)]">
              Every record, first pressing, and artist note becomes part of a shelf that is unmistakably yours.
            </p>
            <Link href="/login" className="mm-text-link mt-8 text-[var(--mm-mint)]">
              Build your shelf <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="profile-card">
            <div className="flex items-center gap-5">
              <MintMusicMark variant="signature-mint-metal" markOnly decorative className="w-24 shrink-0" />
              <div>
                <p className="mm-eyebrow text-[var(--mm-mint-soft)]">COLLECTOR SINCE 2026</p>
                <h3 className="mt-2 text-2xl font-semibold">Nia&apos;s shelf</h3>
                <p className="mt-1 text-[var(--mm-chrome)]">28 records · 11 artists</p>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {['FIRST LISTEN', 'DEEP CUTS', 'EDITION 01'].map((badge) => (
                <div key={badge} className="collection-badge">
                  <span className="collection-badge__dot" aria-hidden="true" />
                  <span>{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rare-section mm-section">
        <div className="mm-shell">
          <div className="rare-card">
            <div className="relative z-10 max-w-2xl">
              <p className="mm-eyebrow text-[var(--mm-gold)]">05 / FIRST EDITION</p>
              <h2 className="mm-heading mt-7">The first 500 pressings, numbered for good.</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--mm-chrome)]">
                “Midnight Assembly” by The Low Season. Each copy carries its exact place in the original run.
              </p>
              <Link href="/discover" className="mm-button mt-9">
                View the first edition
              </Link>
            </div>
            <div className="rare-card__disc">
              <MintMusicMark variant="bonus-gold" markOnly decorative className="w-full" />
              <p className="mm-eyebrow mt-5 text-center text-[var(--mm-gold)]">PRESSING 001 / 500</p>
            </div>
          </div>
        </div>
      </section>

      <section id="for-artists" className="mm-section bg-[var(--mm-paper)] text-[var(--mm-ink)]">
        <div className="mm-shell grid items-center gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-24">
          <div>
            <p className="mm-eyebrow mm-eyebrow--rule">06 / FOR ARTISTS</p>
            <h2 className="mm-heading mt-7">Build your universe, one record at a time.</h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[color:var(--mm-ink-muted)]">
              Bring your music, artwork, liner notes, and listeners together. You decide how many copies exist and what each release means.
            </p>
            <Link href="/creator/apply" className="mm-button mt-9">
              Share your next release
            </Link>
          </div>
          <div className="artist-stamp">
            <MintMusicMark variant="signature-ivory" decorative className="w-full" />
            <p className="mm-eyebrow mt-8">ARTIST SERIES / 2026</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="mm-shell">
          <div className="flex flex-col justify-between gap-10 border-b border-[var(--mm-charcoal)] pb-12 md:flex-row md:items-center">
            <Link href="/" aria-label="MintMusic home" className="mm-focus-ring w-fit rounded-lg">
              <MintMusicMark variant="core-onyx" interactive decorative className="w-44" />
            </Link>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-7 gap-y-4">
              <Link className="footer-link" href="/discover">Discover</Link>
              <Link className="footer-link" href="/collector">Your collection</Link>
              <Link className="footer-link" href="/creator/apply">For artists</Link>
              <Link className="footer-link" href="/login">Sign in</Link>
            </nav>
          </div>
          <div className="flex flex-col justify-between gap-4 pt-8 text-sm text-[var(--mm-chrome)] sm:flex-row">
            <p>© 2026 MintMusic</p>
            <p>Music chosen by people, kept with care.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
