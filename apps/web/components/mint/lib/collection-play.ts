/**
 * Collection turntable play/pause.
 *
 * Discover keeps the engine loaded on the current queue track. Switching to
 * Collection shows a different record (newest collected) but does not load it.
 * Toggling in that state plays the Discover song while the vinyl stays still.
 */
export type CollectionPlayIntent = 'noop' | 'toggle' | 'play-selected';

export function resolveCollectionPlayIntent(
  selectedSongId: string | null,
  engineSongId: string | null,
): CollectionPlayIntent {
  if (!selectedSongId) return 'noop';
  if (engineSongId === selectedSongId) return 'toggle';
  return 'play-selected';
}
