# Mobile store publishing

MintMusic has three installation channels:

1. The installable PWA from `https://mintmusic.ai/install`
2. A Capacitor iOS app distributed through App Store Connect
3. A Capacitor Android app distributed through Google Play Console

The native applications use package/bundle identifier `ai.mintmusic.app`. Changing it after
creating store records produces a different application and breaks verified links.

## Release model and billing

The native apps are reader-style clients for sign-in, discovery, collection access, and
playback. Web card, cryptocurrency, and external digital-content purchase controls are hidden
when the app runs under Capacitor. This is intentional: Apple In-App Purchase and Google Play
Billing are required before selling digital releases inside store-distributed builds.

Do not re-enable Stripe or wallet purchase buttons in native builds. A future native purchase
release must add StoreKit 2 and Google Play Billing, server-side receipt/purchase-token
verification, entitlement reconciliation, restore-purchases behavior, refunds/revocations, and
the applicable marketplace commission/tax handling.

## Production web configuration

These values are required before native review:

```bash
NEXT_PUBLIC_APP_URL=https://mintmusic.ai
NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/id<APP_STORE_ID>
NEXT_PUBLIC_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=ai.mintmusic.app

APPLE_DEVELOPER_TEAM_ID=<10_CHARACTER_TEAM_ID>
ANDROID_APP_SHA256_CERT_FINGERPRINTS=<PLAY_APP_SIGNING_SHA256>

APPLE_CLIENT_ID=ai.mintmusic.web
APPLE_CLIENT_SECRET=<SIGNED_APPLE_CLIENT_SECRET>
```

The Apple OAuth service ID, return URL, private key, and secret rotation must be configured in
the Apple Developer portal. Sign in with Apple is included because the app also offers Google
and GitHub authentication.

Verify these public URLs return HTTP 200 without redirects or authentication:

- `https://mintmusic.ai/privacy`
- `https://mintmusic.ai/terms`
- `https://mintmusic.ai/support`
- `https://mintmusic.ai/account-deletion`
- `https://mintmusic.ai/.well-known/apple-app-site-association`
- `https://mintmusic.ai/.well-known/assetlinks.json`

## Apple App Store checklist

Account and signing:

- Active Apple Developer Program organization account
- App ID `ai.mintmusic.app`, Associated Domains capability, and App Store Connect app record
- Distribution certificate/provisioning through Xcode and a unique build number
- Agreements, tax, and banking completed in App Store Connect

Product and policy:

- Sign in with Apple credentials work in the review build
- Reviewer demo account with an owned playable release and no MFA dead end
- In-app account-deletion request works from Settings
- Privacy Policy and Support URLs use the production routes above
- App Privacy answers match `PrivacyInfo.xcprivacy` and actual production processors
- Age rating, content rights, encryption/export compliance, and digital-content declarations
- Rights documentation for submitted music and artwork available on request

Assets:

- App name, subtitle, promotional text, description, keywords, category, copyright
- 1024×1024 opaque app icon (already in the Xcode asset catalog)
- Current screenshots for required iPhone sizes and iPad sizes because the target is universal
- Optional app preview video, review notes, release notes, and marketing URL

Build and submit:

1. `npm run mobile:sync`
2. Open `apps/mobile/ios/App/App.xcodeproj` in the current stable Xcode.
3. Select a generic iOS device, increment version/build, run tests, and create an Archive.
4. Validate the archive, upload to App Store Connect, and distribute through TestFlight.
5. Test OAuth, verified links, safe areas, playback interruption, deletion, and reader-mode
   billing behavior on physical iPhone and iPad hardware.
6. Complete review information, attach the build, and submit manually.

## Google Play checklist

Account and signing:

- Verified Play Console organization account and developer contact details
- App record for `ai.mintmusic.app`
- Play App Signing enabled; upload key kept outside Git
- Incrementing integer `ANDROID_VERSION_CODE` for every uploaded artifact

Product and policy:

- Data safety form matches the privacy policy and actual SDK behavior
- Account deletion URL is entered in Play Console and deletion works in-app
- Target audience, content rating questionnaire, ads declaration, app access instructions,
  content rights, financial-features declaration, and privacy-policy URL
- Reviewer credentials and instructions for accessing owned playback
- Reader-mode billing behavior verified; no web checkout or wallet purchase control in-app

Assets:

- App title (30 characters), short description (80), full description (4,000)
- 512×512 app icon, 1024×500 feature graphic, phone screenshots, and tablet screenshots
- Support email, website, privacy URL, release notes, and category

Build and submit:

1. Create the upload keystore once and store it in the team secret manager.
2. Export the Android signing/version environment variables documented in `apps/mobile/README.md`.
3. Run `npm run mobile:sync` and `npm run mobile:android:release`.
4. Upload `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.
5. Copy the Play app-signing SHA-256 fingerprint into
   `ANDROID_APP_SHA256_CERT_FINGERPRINTS`, deploy the web app, and verify Android App Links.
6. Test the internal track on physical phone and tablet hardware, then promote through closed,
   open, and production tracks as appropriate.

## Release gates

Do not submit until all gates are true:

- Production API, OAuth, DRM/media, payments, and support mailboxes are operational
- Association endpoints return the exact production team/certificate identifiers
- Legal counsel or the responsible operator approves Privacy Policy and Terms
- Store privacy/data-safety disclosures match every production SDK and processor
- Physical-device tests cover sign-in, sign-out, deep links, interruption recovery, deletion,
  accessibility, reduced motion, offline failure, and owned playback
- Store screenshots show the submitted build and contain no placeholder or unavailable content

Store accounts, signing keys, certificate fingerprints, team IDs, final legal approval, reviewer
credentials, and screenshots are operator-owned inputs and must never be committed to Git.
