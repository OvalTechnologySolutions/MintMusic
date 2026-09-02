export type ReleaseType = 'single' | 'album' | 'music_video' | 'visualizer';
export type MediaFormat = 'mp3' | 'wav' | 'mp4';

export const ALLOWED_MEDIA_MIME: Record<MediaFormat, string[]> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  mp4: ['video/mp4', 'audio/mp4'],
};

export interface CreateReleaseRequest {
  type: ReleaseType;
  title: string;
  description?: string;
  genreTags?: string[];
  /** Creator-controlled price per release (cents) */
  priceCents: number;
  currency?: string;
  /** Primary asset for single / music_video / visualizer */
  mediaAssetId?: string;
  coverUrl?: string;
  /** Multi-track album: one media asset per track */
  tracks?: CreateTrackRequest[];
}

export interface CreateTrackRequest {
  title: string;
  trackNumber: number;
  mediaAssetId: string;
  durationMs?: number;
}

export interface TrackSummary {
  id: string;
  title: string;
  trackNumber: number;
  durationMs?: number;
  mediaAssetId: string;
  drmReady: boolean;
}

export interface ReleaseSummary {
  id: string;
  creatorId: string;
  type: ReleaseType;
  title: string;
  coverUrl?: string;
  genreTags: string[];
  priceCents: number;
  currency: string;
  published: boolean;
  publishedAt?: string;
}

export interface UploadIntentRequest {
  filename: string;
  mimeType: string;
  byteSize: number;
}

export interface UploadIntentResponse {
  mediaAssetId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}
