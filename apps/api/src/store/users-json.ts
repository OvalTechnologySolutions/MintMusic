import type {
  CreatorStatus,
  OAuthSyncRequest,
  PublicUserProfile,
  UpdateUserRequest,
  User,
  UserRole,
} from '@mintmusic/shared';
import { ConflictError } from '../lib/errors.js';
import { readJson, updateJson } from './json-db.js';
import {
  assertValidSocialLinks,
  mapSocialLinkInputs,
} from '../services/social-links.js';

const FILE = 'users.json';
const DELETION_REQUESTS_FILE = 'account-deletion-requests.json';

interface AccountDeletionRequestRecord {
  id: string;
  userId: string;
  status: 'pending';
  requestedAt: string;
  updatedAt: string;
}

export interface UserRecord extends User {
  provider: string;
  providerAccountId: string;
}

async function load(): Promise<UserRecord[]> {
  return readJson<UserRecord[]>(FILE, []);
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
  let result: User | undefined;
  await updateJson<UserRecord[]>(FILE, [], (users) => {
    const now = new Date().toISOString();
    const existingIdx = users.findIndex(
      (u) => u.email.toLowerCase() === input.email.toLowerCase()
    );

    if (existingIdx >= 0) {
      const existing = users[existingIdx];
      if (
        existing.provider !== input.provider ||
        existing.providerAccountId !== input.providerAccountId
      ) {
        throw new ConflictError(
          'This email is already registered with a different sign-in method'
        );
      }
      users[existingIdx] = {
        ...existing,
        name: input.name || existing.name,
        image: input.image ?? existing.image,
        socialLinks: existing.socialLinks ?? [],
        updatedAt: now,
      };
      result = toPublicUser(users[existingIdx]);
      return users;
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
    result = toPublicUser(user);
    return users;
  });
  return result!;
}

export async function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<User | null> {
  let result: User | null = null;
  await updateJson<UserRecord[]>(FILE, [], (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return users;

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
    result = toPublicUser(users[idx]);
    return users;
  });
  return result;
}

export async function setCreatorStatus(
  id: string,
  status: CreatorStatus,
  role?: UserRole
): Promise<User | null> {
  let result: User | null = null;
  await updateJson<UserRecord[]>(FILE, [], (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return users;

    const now = new Date().toISOString();
    users[idx] = {
      ...users[idx],
      creatorStatus: status,
      role: role ?? users[idx].role,
      updatedAt: now,
    };
    result = toPublicUser(users[idx]);
    return users;
  });
  return result;
}

export async function setStripeConnect(
  id: string,
  accountId: string,
  chargesEnabled: boolean,
  payoutsEnabled: boolean
): Promise<User | null> {
  let result: User | null = null;
  await updateJson<UserRecord[]>(FILE, [], (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return users;

    const now = new Date().toISOString();
    users[idx] = {
      ...users[idx],
      stripeConnectAccountId: accountId,
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectPayoutsEnabled: payoutsEnabled,
      updatedAt: now,
    };
    result = toPublicUser(users[idx]);
    return users;
  });
  return result;
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

export async function getAccountDeletionRequest(userId: string) {
  const requests = await readJson<AccountDeletionRequestRecord[]>(DELETION_REQUESTS_FILE, []);
  return requests.find((request) => request.userId === userId) ?? null;
}

export async function requestAccountDeletion(userId: string) {
  let result: AccountDeletionRequestRecord | undefined;
  await updateJson<AccountDeletionRequestRecord[]>(
    DELETION_REQUESTS_FILE,
    [],
    (requests) => {
      const now = new Date().toISOString();
      const existing = requests.find((request) => request.userId === userId);
      if (existing) {
        existing.status = 'pending';
        existing.requestedAt = now;
        existing.updatedAt = now;
        result = existing;
        return requests;
      }
      const request: AccountDeletionRequestRecord = {
        id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        status: 'pending',
        requestedAt: now,
        updatedAt: now,
      };
      requests.push(request);
      result = request;
      return requests;
    }
  );
  return result!;
}

export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  let cancelled = false;
  await updateJson<AccountDeletionRequestRecord[]>(
    DELETION_REQUESTS_FILE,
    [],
    (requests) => {
      const remaining = requests.filter((request) => request.userId !== userId);
      cancelled = remaining.length !== requests.length;
      return remaining;
    }
  );
  return cancelled;
}

/** Export all JSON users for migration */
export async function exportAllUsers(): Promise<UserRecord[]> {
  return load();
}
