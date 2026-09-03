import type { Metadata } from 'next';
import Link from 'next/link';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with your MintMusic account, collection, purchases, or playback.',
};

export default function SupportPage() {
  return (
    <PolicyPage eyebrow="SUPPORT" title="How can we help?">
      <section>
        <h2>Contact support</h2>
        <p>
          Email <a href="mailto:support@mintmusic.ai">support@mintmusic.ai</a> with the email on
          your account, your device and app version, and a description of what happened. Do not
          send passwords, private keys, wallet recovery phrases, full card numbers, or DRM keys.
        </p>
      </section>

      <section>
        <h2>Playback and collection access</h2>
        <p>
          Confirm that you are signed into the account used to collect the release and that your
          device has a secure internet connection. Protected releases may require a supported
          browser or current mobile app. If playback still fails, include the release title and
          approximate time of the error in your message.
        </p>
      </section>

      <section>
        <h2>Payments and refunds</h2>
        <p>
          For web purchases, include the receipt or transaction identifier. Never send full
          payment credentials. Marketplace purchases are handled through Apple or Google and
          must follow that marketplace&apos;s refund process.
        </p>
      </section>

      <section>
        <h2>Account and privacy</h2>
        <p>
          Update account details from <Link href="/">Profile &amp; Settings</Link>. To permanently
          remove an account, review the <Link href="/account-deletion">account deletion steps</Link>.
          Privacy requests can be sent to{' '}
          <a href="mailto:privacy@mintmusic.ai">privacy@mintmusic.ai</a>.
        </p>
      </section>
    </PolicyPage>
  );
}
