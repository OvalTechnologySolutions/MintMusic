import type { Metadata } from 'next';
import InstallOptions from '../components/InstallOptions';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Install MintMusic',
  description: 'Install MintMusic on iPhone, iPad, Android, or desktop.',
};

export default function InstallPage() {
  return (
    <PolicyPage eyebrow="MOBILE & DESKTOP" title="Keep your collection one tap away">
      <p className="max-w-2xl text-lg">
        Install MintMusic from your browser today. Native App Store and Google Play links appear
        here automatically after each marketplace release is approved.
      </p>
      <InstallOptions />
      <section>
        <h2>One account, every installation</h2>
        <p>
          Your collection belongs to your MintMusic account, not one device. Sign in with the
          same account to reach owned records across the web, Home Screen installation, and
          native mobile editions.
        </p>
      </section>
      <section>
        <h2>Connection and downloads</h2>
        <p>
          MintMusic currently requires a connection for authentication, payments, rights checks,
          and playback authorization. Offline downloads are not enabled, so protected or account
          responses are never served from a stale application cache.
        </p>
      </section>
    </PolicyPage>
  );
}
