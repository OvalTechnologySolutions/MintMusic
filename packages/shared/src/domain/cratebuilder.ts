/** CrateBuilder shared contracts — internal outreach vs public discovery. */

export type CbSourceType =
  | 'editorial_url'
  | 'social_account'
  | 'playlist'
  | 'manual'
  | 'feed';

export type CbEntityType = 'solo' | 'group' | 'unknown';

export type CbOutreachStatus =
  | 'not_reviewed'
  | 'ready'
  | 'contacted'
  | 'responded'
  | 'onboarded'
  | 'do_not_contact';

export type CbContactKind =
  | 'booking'
  | 'management'
  | 'inquiries'
  | 'phone'
  | 'form'
  | 'other';

export type CbReviewStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'needs_review';

export type CbRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_partial'
  | 'failed'
  | 'cancelled';

export type CbConnectorId =
  | 'editorial_html'
  | 'manual_import'
  | 'musicbrainz'
  | 'wikidata'
  | 'spotify'
  | 'tiktok'
  | 'instagram'
  | 'x'
  | 'facebook';

export interface CbConnectorStatusDto {
  id: CbConnectorId;
  enabled: boolean;
  reason?: string | null;
  lastError?: string | null;
  lastOkAt?: string | null;
}

export interface CbProfileDto {
  id: string;
  platform: string;
  url: string;
  handle?: string | null;
  externalAccountId?: string | null;
  verified: boolean;
}

export interface CbContactDto {
  id: string;
  kind: CbContactKind;
  value: string;
  role?: string | null;
  representativeName?: string | null;
  organization?: string | null;
  verified: boolean;
  preferred: boolean;
  suppressed: boolean;
}

export interface CbObservationDto {
  id: string;
  field: string;
  value: string;
  sourceUrl?: string | null;
  sourceType?: string | null;
  retrievedAt: string;
  excerpt?: string | null;
  method: string;
  confidence: number;
  explanation?: string | null;
  reviewStatus: CbReviewStatus;
}

export interface CbArtistSummaryDto {
  id: string;
  stageName: string;
  entityType: CbEntityType;
  genres: string[];
  currentCity?: string | null;
  currentRegion?: string | null;
  currentCountry?: string | null;
  website?: string | null;
  firstDiscoveredAt: string;
  discoveryVisible: boolean;
  outreachStatus: CbOutreachStatus;
  preferredContact?: Pick<CbContactDto, 'id' | 'kind' | 'value' | 'verified'> | null;
  profileCount: number;
  contactCount: number;
}

export interface CbArtistDetailDto extends CbArtistSummaryDto {
  bio?: string | null;
  hometownCity?: string | null;
  hometownRegion?: string | null;
  hometownCountry?: string | null;
  linkInBioUrl?: string | null;
  emergingStatus?: string | null;
  outreachNotes?: string | null;
  outreachAssignedTo?: string | null;
  adminLockedFields: string[];
  suppressedAt?: string | null;
  aliases: string[];
  profiles: CbProfileDto[];
  contacts: CbContactDto[];
  observations: CbObservationDto[];
  externalIds: Array<{ provider: string; externalId: string; url?: string | null }>;
}

/** Public discovery allowlist — never includes contacts, outreach, or evidence. */
export interface CbPublicArtistDto {
  id: string;
  stageName: string;
  entityType: CbEntityType;
  bio?: string | null;
  genres: string[];
  currentCity?: string | null;
  currentRegion?: string | null;
  currentCountry?: string | null;
  website?: string | null;
  firstDiscoveredAt: string;
  profiles: Array<{ platform: string; url: string; handle?: string | null }>;
}

export interface CbPublicArtistsResponse {
  artists: CbPublicArtistDto[];
  nextCursor?: string;
}

export interface CbSourceDto {
  id: string;
  name: string;
  type: CbSourceType;
  url?: string | null;
  connectorId: string;
  enabled: boolean;
  publicationDate?: string | null;
  lastFetchedAt?: string | null;
  configJson?: Record<string, unknown>;
}

export interface CbRunSummaryDto {
  id: string;
  status: CbRunStatus;
  trigger: string;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  coverageNotes?: string | null;
  partialFailure: boolean;
  summaryJson: Record<string, unknown>;
  errorMessage?: string | null;
  createdAt: string;
}

export interface CbExportDto {
  id: string;
  filename: string;
  exportDate: string;
  complete: boolean;
  isLatest: boolean;
  byteSize?: number | null;
  createdAt: string;
  runId?: string | null;
}

export interface CbDashboardCounts {
  totalArtists: number;
  newArtists24h: number;
  updatedArtists24h: number;
  verifiedContacts: number;
  reviewQueueOpen: number;
  connectorFailures: number;
  lastRun?: CbRunSummaryDto | null;
}

export interface CbArtistsQuery {
  q?: string;
  genre?: string;
  location?: string;
  source?: string;
  outreachStatus?: CbOutreachStatus;
  recent?: string;
  cursor?: string;
  limit?: string;
}

export interface CbImportArtistRow {
  stageName: string;
  entityType?: CbEntityType;
  bio?: string;
  genres?: string[];
  website?: string;
  profiles?: Array<{ platform: string; url: string }>;
  contacts?: Array<{
    kind: CbContactKind;
    value: string;
    role?: string;
    representativeName?: string;
    organization?: string;
  }>;
  sourceUrl?: string;
}
