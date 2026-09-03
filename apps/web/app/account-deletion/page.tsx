import type { Metadata } from 'next';
import Link from 'next/link';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Account Deletion',
  description: 'Request deletion of a MintMusic account and associated personal data.',
};

export default function AccountDeletionPage() {
  return (
    <PolicyPage eyebrow="ACCOUNT CONTROL" title="Delete your MintMusic account">
      <section>
        <h2>Start in the app</h2>
        <p>
          Sign in, open <Link href="/settings?tab=account">Settings → Account</Link>, and choose
          “Request account deletion.” This works from the website and the iOS or Android app.
          You can cancel from the same screen before processing is complete.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/settings?tab=account" className="mm-button">Open account settings</Link>
          <Link href="/login" className="mm-button mm-button--ghost">Sign in</Link>
        </div>
      </section>

      <section>
        <h2>What is deleted</h2>
        <p>
          We delete or anonymize your profile, OAuth identifiers, optional social and wallet
          connections, playback history, saved preferences, and other personal account data that
          we are not required to retain. Public blockchain transactions cannot be deleted.
        </p>
      </section>

      <section>
        <h2>What may be retained</h2>
        <p>
          Purchase, payout, fraud-prevention, rights-management, and tax records may be retained
          only for the period required by law or to establish, exercise, or defend legal claims.
          Retained records are restricted from ordinary product use.
        </p>
      </section>

      <section>
        <h2>Timing and help</h2>
        <p>
          We verify and complete requests within 30 days unless law requires a different period.
          If you cannot access your account, email{' '}
          <a href="mailto:privacy@mintmusic.ai?subject=MintMusic%20account%20deletion">
            privacy@mintmusic.ai
          </a>{' '}
          from the account email.
        </p>
      </section>
    </PolicyPage>
  );
}
