export interface PlaybackTrackMedia<T> {
  id: string;
  trackNumber: number;
  mediaAsset: T | null;
}

export interface PlaybackReleaseMedia<T> {
  mediaAsset: T | null;
  tracks: PlaybackTrackMedia<T>[];
}

export interface ResolvedPlaybackMedia<T> {
  mediaAsset: T | null;
  /** Track that supplied the asset, when playback is track-backed. */
  trackId?: string;
  /** True when the client asked for a track that is not on this release. */
  trackMissing: boolean;
}

/**
 * Resolve playable media for a purchased release.
 *
 * Singles/videos store the asset on the release. Albums store assets on
 * tracks, so a request with no trackId must fall back to the first track
 * instead of 404ing a paid collector.
 */
export function resolvePlaybackMedia<T>(
  release: PlaybackReleaseMedia<T>,
  trackId?: string
): ResolvedPlaybackMedia<T> {
  if (trackId) {
    const track = release.tracks.find((t) => t.id === trackId);
    if (!track) {
      return { mediaAsset: null, trackMissing: true };
    }
    return {
      mediaAsset: track.mediaAsset,
      trackId: track.id,
      trackMissing: false,
    };
  }

  if (release.mediaAsset) {
    return { mediaAsset: release.mediaAsset, trackMissing: false };
  }

  const first = [...release.tracks].sort(
    (a, b) => a.trackNumber - b.trackNumber
  )[0];
  if (!first) {
    return { mediaAsset: null, trackMissing: false };
  }
  return {
    mediaAsset: first.mediaAsset,
    trackId: first.id,
    trackMissing: false,
  };
}
