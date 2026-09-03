# MintMusic native apps

Capacitor packages the production MintMusic service for iOS and Android under the stable
application identifier `ai.mintmusic.app`.

The native apps load `https://mintmusic.ai` over HTTPS. `dist/index.html` is a packaged
connection-failure fallback, not an offline copy of authenticated, payment, or playback data.
The web app detects Capacitor, handles verified links and Android back navigation, configures
the status bar, and adds light touch feedback.

## Commands

From the repository root:

```bash
npm run mobile:sync
npm run mobile:android:debug
npm run mobile:android:release
```

Open native projects when platform tools are installed:

```bash
npm run open:android -w @mintmusic/mobile
npm run open:ios -w @mintmusic/mobile
```

Run `npm run mobile:sync` after changing Capacitor plugins or `capacitor.config.json`.
Do not replace the application identifier after a store record has been created.

## Android release environment

The release bundle reads signing and version values without storing secrets in Git:

```bash
ANDROID_VERSION_CODE=1
ANDROID_VERSION_NAME=1.0.0
ANDROID_KEYSTORE_FILE=/absolute/path/to/upload-key.jks
ANDROID_KEYSTORE_PASSWORD=...
ANDROID_KEY_ALIAS=upload
ANDROID_KEY_PASSWORD=...
```

Use Play App Signing. `ANDROID_APP_SHA256_CERT_FINGERPRINTS` on the web deployment must contain
the Play app-signing certificate fingerprint, not only the local upload-key fingerprint.

## iOS release configuration

Open `ios/App/App.xcodeproj`, select the `App` target, choose the Apple Developer team, and keep:

- Bundle identifier: `ai.mintmusic.app`
- Associated Domains: `applinks:mintmusic.ai`, `applinks:www.mintmusic.ai`
- Deployment target: iOS 15 or later
- Automatic signing for development; App Store distribution signing for archives

Set `APPLE_DEVELOPER_TEAM_ID` on the web deployment so the association endpoint returns the
correct application identifier. Xcode and App Store Connect are required to archive and upload;
an iOS release cannot be signed on Linux.

See `docs/mobile-store-publishing.md` for the complete submission checklist.
