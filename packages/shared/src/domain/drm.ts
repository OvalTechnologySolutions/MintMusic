export type DrmSystem = 'widevine' | 'fairplay';
export type DrmPackagingStatus =
  | 'none'
  | 'queued'
  | 'packaging'
  | 'ready'
  | 'failed';

export interface DrmPlaybackRequest {
  releaseId: string;
  /** Required for album multi-track playback */
  trackId?: string;
  drmSystem: DrmSystem;
  deviceHint?: string;
}

export interface DrmPlaybackResponse {
  sessionId: string;
  contentId: string;
  expiresAt: string;
  /** HLS (FairPlay) or DASH (Widevine) manifest */
  manifestUrl: string;
  licenseUrl: string;
  /** Apple FairPlay FPS certificate (base64 DER) — web only */
  fairplayCertificateUrl?: string;
  drmSystem: DrmSystem;
  mimeType: string;
}
