/** Minimal, privacy-light analytics abstraction for the MVP.
 *  Events are logged to the console and the last 100 are kept in localStorage
 *  so a backend sink (Supabase, PostHog, etc.) can be swapped in later. */

export type MintAnalyticsEvent =
  | 'auth_completed'
  | 'onboarding_completed'
  | 'track_loaded'
  | 'track_played'
  | 'track_skipped'
  | 'track_collected'
  | 'collection_track_played'
  | 'artist_profile_enabled'
  | 'song_upload_started'
  | 'song_upload_completed'
  | 'song_published'
  | 'pwa_install_prompt_viewed';

const STORAGE_KEY = 'mint:analytics';

export function track(
  event: MintAnalyticsEvent,
  props: Record<string, unknown> = {},
): void {
  const entry = { event, props, at: new Date().toISOString() };
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[mint:analytics]', event, props);
  }
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-100)));
  } catch {
    /* storage unavailable — analytics is best-effort */
  }
}
