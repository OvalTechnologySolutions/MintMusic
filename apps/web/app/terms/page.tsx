import type { Metadata } from 'next';
import PolicyPage from '../components/PolicyPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of MintMusic.',
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="TERMS" title="Terms of service" updated="September 2, 2026">
      <section>
        <h2>Using MintMusic</h2>
        <p>
          You must be legally able to enter this agreement and provide accurate account
          information. Keep access to your sign-in provider and devices secure. You may not
          misuse the service, evade access controls, interfere with playback protections, scrape
          private data, or violate another person&apos;s rights.
        </p>
      </section>

      <section>
        <h2>Music and licenses</h2>
        <p>
          Artists retain ownership of their music and artwork. Collecting a release grants the
          personal listening rights described at purchase; it does not transfer copyright,
          commercial use rights, or permission to redistribute the files. Availability may vary
          by territory, device, and rights-holder restrictions.
        </p>
      </section>

      <section>
        <h2>Purchases, fees, and platforms</h2>
        <p>
          Prices, edition limits, taxes, refund terms, and payment methods are shown before a web
          purchase. Blockchain transactions may be irreversible and can include network fees.
          Native mobile applications may provide collection and playback access without offering
          purchases. Where in-app purchasing is offered, the applicable app marketplace&apos;s
          billing and refund rules control.
        </p>
      </section>

      <section>
        <h2>Creator responsibilities</h2>
        <p>
          Creators must control the rights needed to upload, sell, stream, and promote their
          content. Creators are responsible for accurate metadata, tax information, payout
          details, and honoring edition or benefit descriptions. We may remove content that is
          unlawful or subject to a credible rights complaint.
        </p>
      </section>

      <section>
        <h2>Service changes and termination</h2>
        <p>
          We may improve, suspend, or discontinue features and may restrict accounts that violate
          these terms or create security or legal risk. You may stop using MintMusic and request
          account deletion at any time. Some obligations concerning payments, licenses,
          intellectual property, and disputes survive termination.
        </p>
      </section>

      <section>
        <h2>Disclaimers and liability</h2>
        <p>
          The service is provided on an “as available” basis to the extent permitted by law. We
          do not guarantee uninterrupted availability, future market value, or continued support
          for every third-party network. Nothing in these terms limits rights that cannot legally
          be waived.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent to{' '}
          <a href="mailto:legal@mintmusic.ai">legal@mintmusic.ai</a>.
        </p>
      </section>
    </PolicyPage>
  );
}
