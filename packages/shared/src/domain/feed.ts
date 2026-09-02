export type PostType =
  | 'announcement'
  | 'release'
  | 'behind_the_scenes'
  | 'listening_party';

export interface CreatePostRequest {
  type: PostType;
  body: string;
  releaseId?: string;
  mediaUrl?: string;
}

export interface FeedPost {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorImage?: string;
  type: PostType;
  body: string;
  releaseId?: string;
  mediaUrl?: string;
  publishedAt: string;
}

export interface FeedResponse {
  items: FeedPost[];
  nextCursor?: string;
}
