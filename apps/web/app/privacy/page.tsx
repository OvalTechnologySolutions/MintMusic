import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How MintMusic collects, uses, and protects personal information.',
};

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="PRIVACY" title="Privacy policy" updated="September 2, 2026">
      <section>
        <h2>What we collect</h2>
        <p>We collect information needed to provide your account and music collection:</p>
        <ul>
          <li>Name, email address, profile image, and sign-in provider identifiers.</li>
          <li>Collection, purchase, wallet, creator, payout, and social-profile information you provide.</li>
          <li>Playback, feature interaction, device, diagnostics, and security information.</li>
          <li>Messages and details you send when requesting support or account deletion.</li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>
          We use information to authenticate you, deliver owned music, process purchases and
          creator payouts, operate social and discovery features, prevent fraud, troubleshoot
          the service, understand product performance, comply with law, and respond to support
          requests. We do not sell personal information or use it for cross-app advertising.
        </p>
      </section>

      <section>
        <h2>Service providers and public records</h2>
        <p>
          We share only what is necessary with infrastructure, storage, analytics,
          authentication, payment, and fraud-prevention providers. Payment card details are
          processed by Stripe and are not stored by MintMusic. Blockchain transactions and
          wallet addresses may be permanently visible on public networks.
        </p>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          We retain account information while your account is active and as needed for security,
          contractual, tax, accounting, and legal obligations. You can start account deletion
          from Settings or our account-deletion page. We aim to complete verified requests within
          30 days, except records we must lawfully retain.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          Depending on your location, you may request access, correction, portability, deletion,
          or restriction of personal information. You can disconnect optional social and wallet
          connections in Settings. Contact <a href="mailto:privacy@mintmusic.ai">privacy@mintmusic.ai</a>.
        </p>
      </section>

      <section>
        <h2>Children and international use</h2>
        <p>
          MintMusic is not directed to children under 13. If local law requires a higher age for
          independent consent, users must meet that age or have valid guardian consent.
          Information may be processed in countries where our providers operate, subject to
          appropriate legal safeguards.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update this policy as the service changes. Material updates will be communicated
          in the app or by email. Questions can be sent to{' '}
          <a href="mailto:privacy@mintmusic.ai">privacy@mintmusic.ai</a>.
        </p>
      </section>
    </PolicyPage>
  );
}
