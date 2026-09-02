export type DiscoveryChannelType = 'genre' | 'mood' | 'regional' | 'editorial';

export interface DiscoveryChannel {
  id: string;
  slug: string;
  name: string;
  description?: string;
  type: DiscoveryChannelType;
  genreTags: string[];
  regionCode?: string;
}

export interface DiscoverStoreQuery {
  genre?: string;
  q?: string;
  type?: 'single' | 'album' | 'music_video' | 'visualizer';
  cursor?: string;
  limit?: number;
}

export interface DiscoverStoreResponse {
  releases: Array<{
    id: string;
    title: string;
    type: string;
    creatorName: string;
    priceCents: number;
    coverUrl?: string;
    genreTags: string[];
  }>;
  nextCursor?: string;
}
