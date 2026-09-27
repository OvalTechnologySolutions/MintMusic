/**
 * The Collection vinyl shares the app-wide PlaybackEngine with Discover.
 * After a collect/skip, Discover advances and loads the *next* record, so
 * the engine's current song is often not the crate's featured vinyl.
 * Toggling blindly would play or pause the leftover Discover track.
 */
export function collectionVinylIntent(
  selectedId: string | null,
  engineSongId: string | null,
): 'none' | 'toggle' | 'load' {
  if (!selectedId) return 'none';
  if (engineSongId === selectedId) return 'toggle';
  return 'load';
}
