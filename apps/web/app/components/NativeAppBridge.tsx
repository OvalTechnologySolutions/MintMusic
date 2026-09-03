'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { routeFromAppUrl } from '@/lib/deep-link';

function navigateToAppRoute(route: string): void {
  const dest = new URL(route, window.location.origin);
  if (dest.origin !== window.location.origin) return;
  if (!dest.pathname.startsWith('/') || dest.pathname.startsWith('//')) return;
  window.location.assign(`${dest.pathname}${dest.search}${dest.hash}`);
}

export default function NativeAppBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListeners: (() => void) | undefined;
    document.documentElement.dataset.nativeApp = Capacitor.getPlatform();

    void (async () => {
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#0A0A0B' });
      }

      const deepLinkListener = await App.addListener('appUrlOpen', ({ url }) => {
        const route = routeFromAppUrl(url);
        if (route) navigateToAppRoute(route);
      });

      const backButtonListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
      });

      const tapTarget = (event: PointerEvent) => {
        if ((event.target as Element | null)?.closest('button, a, [role="button"]')) {
          void Haptics.impact({ style: ImpactStyle.Light });
        }
      };
      document.addEventListener('pointerup', tapTarget, { passive: true });

      removeListeners = () => {
        void deepLinkListener.remove();
        void backButtonListener.remove();
        document.removeEventListener('pointerup', tapTarget);
        delete document.documentElement.dataset.nativeApp;
      };
      if (disposed) removeListeners();
    })();

    return () => {
      disposed = true;
      removeListeners?.();
    };
  }, []);

  return null;
}
