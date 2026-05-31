import type {
  CreatorStatus,
  OAuthSyncRequest,
  PublicUserProfile,
  UpdateUserRequest,
  User,
  UserRole,
} from '@mintmusic/shared';
import { readJson, writeJson } from './json-db.js';
import {
  assertValidSocialLinks,
  mapSocialLinkInputs,
} from '../services/social-links.js';

const FILE = 'users.json';

export interface UserRecord extends User {
  provider: string;
  providerAccountId: string;
}

async function load(): Promise<UserRecord[]> {
  return readJson<UserRecord[]>(FILE, []);
}

async function save(users: UserRecord[]): Promise<void> {
  await writeJson(FILE, users);
}

function newId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const users = await load();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  const users = await load();
  const record = users.find((u) => u.id === id);
  return record ? toPublicUser(record) : undefined;
}

export async function findUserRecordById(
  id: string
): Promise<UserRecord | undefined> {
  const users = await load();
  return users.find((u) => u.id === id);
}

export async function upsertOAuthUser(input: OAuthSyncRequest): Promise<User> {
  const users = await load();
  const now = new Date().toISOString();
  const existingIdx = users.findIndex(
    (u) => u.email.toLowerCase() === input.email.toLowerCase()
  );

  if (existingIdx >= 0) {
    const existing = users[existingIdx];
    users[existingIdx] = {
      ...existing,
      name: input.name || existing.name,
      image: input.image ?? existing.image,
      socialLinks: existing.socialLinks ?? [],
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      updatedAt: now,
    };
    await save(users);
    return toPublicUser(users[existingIdx]);
  }

  const user: UserRecord = {
    id: newId(),
    email: input.email,
    name: input.name,
    image: input.image,
    role: 'collector',
    creatorStatus: 'none',
    socialLinks: [],
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  await save(users);
  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<User | null> {
  const users = await load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  const current = users[idx];

  if (patch.socialLinks) {
    assertValidSocialLinks(patch.socialLinks);
  }

  users[idx] = {
    ...current,
    name: patch.name ?? current.name,
    walletAddress:
      patch.walletAddress === null
        ? undefined
        : patch.walletAddress ?? current.walletAddress,
    socialLinks: patch.socialLinks
      ? mapSocialLinkInputs(patch.socialLinks, current.socialLinks ?? [])
      : current.socialLinks ?? [],
    updatedAt: now,
  };
  await save(users);
  return toPublicUser(users[idx]);
}

export async function setCreatorStatus(
  id: string,
  status: CreatorStatus,
  role?: UserRole
): Promise<User | null> {
  const users = await load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  users[idx] = {
    ...users[idx],
    creatorStatus: status,
    role: role ?? users[idx].role,
    updatedAt: now,
  };
  await save(users);
  return toPublicUser(users[idx]);
}

export async function setStripeConnect(
  id: string,
  accountId: string,
  chargesEnabled: boolean,
  payoutsEnabled: boolean
): Promise<User | null> {
  const users = await load();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  users[idx] = {
    ...users[idx],
    stripeConnectAccountId: accountId,
    stripeConnectChargesEnabled: chargesEnabled,
    stripeConnectPayoutsEnabled: payoutsEnabled,
    updatedAt: now,
  };
  await save(users);
  return toPublicUser(users[idx]);
}

function toPublicUser(record: UserRecord): User {
  const {
    provider: _p,
    providerAccountId: _a,
    ...user
  } = record;
  return {
    ...user,
    socialLinks: user.socialLinks ?? [],
  };
}

export function toPublicProfile(record: UserRecord): PublicUserProfile {
  return {
    id: record.id,
    name: record.name,
    image: record.image,
    role: record.role,
    socialLinks: record.socialLinks ?? [],
  };
}

export async function getPublicProfile(
  id: string
): Promise<PublicUserProfile | null> {
  const users = await load();
  const record = users.find((u) => u.id === id);
  return record ? toPublicProfile(record) : null;
}

/** Export all JSON users for migration */
export async function exportAllUsers(): Promise<UserRecord[]> {
  return load();
}
