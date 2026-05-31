export interface CollectionItem {
  releaseId: string;
  title: string;
  type: string;
  coverUrl?: string;
  creatorName: string;
  purchasedAt: string;
}

export interface PlaybackTokenRequest {
  releaseId: string;
  trackId?: string;
  drmSystem?: 'widevine' | 'fairplay';
  deviceHint?: string;
}

export interface PlaybackTokenResponse {
  sessionId: string;
  streamUrl: string;
  expiresAt: string;
  mimeType: string;
  /** Present when multi-DRM packaging is complete */
  drm?: {
    system: 'widevine' | 'fairplay';
    manifestUrl: string;
    licenseUrl: string;
    contentId: string;
    fairplayCertificateUrl?: string;
  };
}
