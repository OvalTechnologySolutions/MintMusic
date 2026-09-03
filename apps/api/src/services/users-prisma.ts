import type {
  CreatorStatus,
  OAuthSyncRequest,
  PublicUserProfile,
  SocialLink,
  UpdateUserRequest,
  User,
  UserRole,
} from '@mintmusic/shared';
import type { User as PrismaUser, SocialLink as PrismaSocialLink } from '@prisma/client';
import { getPrisma } from '../lib/prisma.js';
import {
  assertValidSocialLinks,
  mapSocialLinkInputs,
} from './social-links.js';

function mapSocialLink(row: PrismaSocialLink): SocialLink {
  return {
    id: row.id,
    platform: row.platform as SocialLink['platform'],
    url: row.url,
    label: row.label ?? undefined,
    isPrimary: row.isPrimary,
    connectionType: row.connectionType as SocialLink['connectionType'],
    externalAccountId: row.externalAccountId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapUser(
  row: PrismaUser & { socialLinks?: PrismaSocialLink[] }
): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image ?? undefined,
    role: row.role as UserRole,
    creatorStatus: row.creatorStatus as CreatorStatus,
    walletAddress: row.walletAddress ?? undefined,
    socialLinks: (row.socialLinks ?? []).map(mapSocialLink),
    stripeConnectAccountId: row.stripeConnectAccountId ?? undefined,
    stripeConnectChargesEnabled: row.stripeConnectChargesEnabled,
    stripeConnectPayoutsEnabled: row.stripeConnectPayoutsEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getPrisma();
  const row = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { socialLinks: true },
  });
  return row ? mapUser(row) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getPrisma();
  const row = await db.user.findUnique({
    where: { id },
    include: { socialLinks: true },
  });
  return row ? mapUser(row) : undefined;
}

export async function upsertOAuthUser(input: OAuthSyncRequest): Promise<User> {
  const db = await getPrisma();
  const row = await db.user.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      email: input.email.toLowerCase(),
      name: input.name,
      image: input.image,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
    },
    update: {
      name: input.name,
      image: input.image,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
    },
    include: { socialLinks: true },
  });
  return mapUser(row);
}

export async function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<User | null> {
  const db = await getPrisma();
  const existing = await db.user.findUnique({
    where: { id },
    include: { socialLinks: true },
  });
  if (!existing) return null;

  if (patch.socialLinks) {
    assertValidSocialLinks(patch.socialLinks);
    const mapped = mapSocialLinkInputs(
      patch.socialLinks,
      existing.socialLinks.map(mapSocialLink)
    );

    await db.$transaction([
      db.socialLink.deleteMany({ where: { userId: id } }),
      ...mapped.map((link) =>
        db.socialLink.create({
          data: {
            id: link.id.startsWith('sl_') ? undefined : link.id,
            userId: id,
            platform: link.platform,
            url: link.url,
            label: link.label,
            isPrimary: link.isPrimary ?? false,
            connectionType: link.connectionType,
            externalAccountId: link.externalAccountId,
          },
        })
      ),
    ]);
  }

  const row = await db.user.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.walletAddress !== undefined
        ? { walletAddress: patch.walletAddress }
        : {}),
    },
    include: { socialLinks: true },
  });
  return mapUser(row);
}

export async function setCreatorStatus(
  id: string,
  status: CreatorStatus,
  role?: UserRole
): Promise<User | null> {
  const db = await getPrisma();
  try {
    const row = await db.user.update({
      where: { id },
      data: {
        creatorStatus: status,
        ...(role ? { role } : {}),
      },
      include: { socialLinks: true },
    });
    return mapUser(row);
  } catch {
    return null;
  }
}

export async function setStripeConnect(
  id: string,
  accountId: string,
  chargesEnabled: boolean,
  payoutsEnabled: boolean
): Promise<User | null> {
  const db = await getPrisma();
  try {
    const row = await db.user.update({
      where: { id },
      data: {
        stripeConnectAccountId: accountId,
        stripeConnectChargesEnabled: chargesEnabled,
        stripeConnectPayoutsEnabled: payoutsEnabled,
      },
      include: { socialLinks: true },
    });
    return mapUser(row);
  } catch {
    return null;
  }
}

export function toPublicProfile(user: User): PublicUserProfile {
  return {
    id: user.id,
    name: user.name,
    image: user.image,
    role: user.role,
    socialLinks: user.socialLinks,
  };
}

export async function getPublicProfile(
  id: string
): Promise<PublicUserProfile | null> {
  const user = await findUserById(id);
  return user ? toPublicProfile(user) : null;
}

export async function getAccountDeletionRequest(userId: string) {
  const db = await getPrisma();
  return db.accountDeletionRequest.findUnique({ where: { userId } });
}

export async function requestAccountDeletion(userId: string) {
  const db = await getPrisma();
  return db.accountDeletionRequest.upsert({
    where: { userId },
    create: { userId },
    update: { status: 'pending', requestedAt: new Date() },
  });
}

export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  const db = await getPrisma();
  const result = await db.accountDeletionRequest.deleteMany({ where: { userId } });
  return result.count > 0;
}

/** Import a user record from legacy JSON store */
export async function importJsonUser(record: {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  creatorStatus: CreatorStatus;
  walletAddress?: string;
  provider: string;
  providerAccountId: string;
  stripeConnectAccountId?: string;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  socialLinks?: SocialLink[];
  createdAt: string;
  updatedAt: string;
}): Promise<User> {
  const db = await getPrisma();

  const row = await db.user.upsert({
    where: { email: record.email.toLowerCase() },
    create: {
      id: record.id,
      email: record.email.toLowerCase(),
      name: record.name,
      image: record.image,
      role: record.role,
      creatorStatus: record.creatorStatus,
      walletAddress: record.walletAddress,
      provider: record.provider,
      providerAccountId: record.providerAccountId,
      stripeConnectAccountId: record.stripeConnectAccountId,
      stripeConnectChargesEnabled: record.stripeConnectChargesEnabled ?? false,
      stripeConnectPayoutsEnabled: record.stripeConnectPayoutsEnabled ?? false,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    },
    update: {
      name: record.name,
      image: record.image,
      role: record.role,
      creatorStatus: record.creatorStatus,
      walletAddress: record.walletAddress,
      provider: record.provider,
      providerAccountId: record.providerAccountId,
      stripeConnectAccountId: record.stripeConnectAccountId,
      stripeConnectChargesEnabled: record.stripeConnectChargesEnabled ?? false,
      stripeConnectPayoutsEnabled: record.stripeConnectPayoutsEnabled ?? false,
      updatedAt: new Date(record.updatedAt),
    },
    include: { socialLinks: true },
  });

  if (record.socialLinks?.length) {
    await db.socialLink.deleteMany({ where: { userId: row.id } });
    for (const link of record.socialLinks) {
      await db.socialLink.create({
        data: {
          userId: row.id,
          platform: link.platform,
          url: link.url,
          label: link.label,
          isPrimary: link.isPrimary ?? false,
          connectionType: link.connectionType,
          externalAccountId: link.externalAccountId,
        },
      });
    }
  }

  const refreshed = await db.user.findUniqueOrThrow({
    where: { id: row.id },
    include: { socialLinks: true },
  });
  return mapUser(refreshed);
}
