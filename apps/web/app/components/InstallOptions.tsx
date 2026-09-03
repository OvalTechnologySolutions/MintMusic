'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL;
const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL;

export default function InstallOptions() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setInstalled(
        Capacitor.isNativePlatform() ||
        window.matchMedia('(display-mode: standalone)').matches
      );
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    });

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const installPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === 'accepted' ? 'MintMusic was added to your device.' : 'Installation cancelled.');
    setInstallPrompt(null);
  };

  if (installed) {
    return (
      <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/30 p-5">
        <h2>MintMusic is installed</h2>
        <p>Open it from your Home Screen or app launcher for the full-screen experience.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
        <p className="mm-eyebrow text-[var(--mm-mint-soft)]">INSTALL FROM THE WEB</p>
        <h2 className="mt-4">Add MintMusic now</h2>
        {installPrompt ? (
          <>
            <p>Install the secure PWA from this browser. It opens like an app and stays connected to the same account.</p>
            <button type="button" className="mm-button mt-5 w-full" onClick={() => void installPwa()}>
              Install MintMusic
            </button>
          </>
        ) : isIos ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>Open this page in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Choose “Add to Home Screen,” then tap Add.</li>
          </ol>
        ) : (
          <p>
            Open your browser menu and choose “Install app” or “Add to Home Screen.”
            Installation is offered only by supported secure browsers.
          </p>
        )}
        {message ? <p role="status" className="mt-3 text-sm text-gray-300">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
        <p className="mm-eyebrow text-[var(--mm-mint-soft)]">NATIVE STORES</p>
        <h2 className="mt-4">App marketplace releases</h2>
        <p>
          Native iOS and Android editions provide collection access, playback, verified links,
          safe-area integration, and platform navigation.
        </p>
        <div className="mt-5 grid gap-3">
          {appStoreUrl ? (
            <a className="mm-button w-full" href={appStoreUrl} rel="external">Download on the App Store</a>
          ) : (
            <span className="rounded-xl border border-gray-700 px-4 py-3 text-center text-sm text-gray-400">
              App Store release pending review
            </span>
          )}
          {googlePlayUrl ? (
            <a className="mm-button mm-button--ghost w-full" href={googlePlayUrl} rel="external">Get it on Google Play</a>
          ) : (
            <span className="rounded-xl border border-gray-700 px-4 py-3 text-center text-sm text-gray-400">
              Google Play release pending review
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
