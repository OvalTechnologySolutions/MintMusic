import type {
  CbArtist,
  CbContact,
  CbObservation,
  CbProfile,
  CbAlias,
  CbExternalId,
} from '@prisma/client';
import type {
  CbArtistDetailDto,
  CbArtistSummaryDto,
  CbPublicArtistDto,
  CbContactDto,
  CbObservationDto,
  CbProfileDto,
} from '@mintmusic/shared';

type ArtistWithCounts = CbArtist & {
  preferredContact?: CbContact | null;
  _count?: { profiles: number; contacts: number };
  profiles?: CbProfile[];
  contacts?: CbContact[];
  aliases?: CbAlias[];
  observations?: CbObservation[];
  externalIds?: CbExternalId[];
};

export function toProfileDto(p: CbProfile): CbProfileDto {
  return {
    id: p.id,
    platform: p.platform,
    url: p.url,
    handle: p.handle,
    externalAccountId: p.externalAccountId,
    verified: p.verified,
  };
}

export function toContactDto(c: CbContact): CbContactDto {
  return {
    id: c.id,
    kind: c.kind,
    value: c.value,
    role: c.role,
    representativeName: c.representativeName,
    organization: c.organization,
    verified: c.verified,
    preferred: c.preferred,
    suppressed: c.suppressed,
  };
}

export function toObservationDto(o: CbObservation): CbObservationDto {
  return {
    id: o.id,
    field: o.field,
    value: o.value,
    sourceUrl: o.sourceUrl,
    sourceType: o.sourceType,
    retrievedAt: o.retrievedAt.toISOString(),
    excerpt: o.excerpt,
    method: o.method,
    confidence: o.confidence,
    explanation: o.explanation,
    reviewStatus: o.reviewStatus,
  };
}

export function toArtistSummaryDto(a: ArtistWithCounts): CbArtistSummaryDto {
  return {
    id: a.id,
    stageName: a.stageName,
    entityType: a.entityType,
    genres: a.genres,
    currentCity: a.currentCity,
    currentRegion: a.currentRegion,
    currentCountry: a.currentCountry,
    website: a.website,
    firstDiscoveredAt: a.firstDiscoveredAt.toISOString(),
    discoveryVisible: a.discoveryVisible,
    outreachStatus: a.outreachStatus,
    preferredContact: a.preferredContact
      ? {
          id: a.preferredContact.id,
          kind: a.preferredContact.kind,
          value: a.preferredContact.value,
          verified: a.preferredContact.verified,
        }
      : null,
    profileCount: a._count?.profiles ?? a.profiles?.length ?? 0,
    contactCount: a._count?.contacts ?? a.contacts?.length ?? 0,
  };
}

export function toArtistDetailDto(a: ArtistWithCounts): CbArtistDetailDto {
  return {
    ...toArtistSummaryDto(a),
    bio: a.bio,
    hometownCity: a.hometownCity,
    hometownRegion: a.hometownRegion,
    hometownCountry: a.hometownCountry,
    linkInBioUrl: a.linkInBioUrl,
    emergingStatus: a.emergingStatus,
    outreachNotes: a.outreachNotes,
    outreachAssignedTo: a.outreachAssignedTo,
    adminLockedFields: a.adminLockedFields,
    suppressedAt: a.suppressedAt?.toISOString() ?? null,
    aliases: (a.aliases ?? []).map((x) => x.alias),
    profiles: (a.profiles ?? []).map(toProfileDto),
    contacts: (a.contacts ?? []).map(toContactDto),
    observations: (a.observations ?? []).map(toObservationDto),
    externalIds: (a.externalIds ?? []).map((e) => ({
      provider: e.provider,
      externalId: e.externalId,
      url: e.url,
    })),
  };
}

/** Explicit allowlist for public discovery — strips contacts/outreach/evidence. */
export function toPublicArtistDto(a: ArtistWithCounts): CbPublicArtistDto {
  return {
    id: a.id,
    stageName: a.stageName,
    entityType: a.entityType,
    bio: a.bio,
    genres: a.genres,
    currentCity: a.currentCity,
    currentRegion: a.currentRegion,
    currentCountry: a.currentCountry,
    website: a.website,
    firstDiscoveredAt: a.firstDiscoveredAt.toISOString(),
    profiles: (a.profiles ?? []).map((p) => ({
      platform: p.platform,
      url: p.url,
      handle: p.handle,
    })),
  };
}
