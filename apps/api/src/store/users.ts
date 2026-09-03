import type {
  CreatorStatus,
  OAuthSyncRequest,
  PublicUserProfile,
  UpdateUserRequest,
  User,
  UserRole,
} from '@mintmusic/shared';
import { isDatabaseConfigured } from '../config/env.js';
import * as jsonStore from './users-json.js';
import * as prismaStore from '../services/users-prisma.js';

export type { UserRecord } from './users-json.js';

async function usePrisma(): Promise<boolean> {
  return isDatabaseConfigured();
}

export async function findUserByEmail(email: string) {
  if (await usePrisma()) return prismaStore.findUserByEmail(email);
  return jsonStore.findUserByEmail(email);
}

export async function findUserById(id: string): Promise<User | undefined> {
  if (await usePrisma()) return prismaStore.findUserById(id);
  return jsonStore.findUserById(id);
}

export async function findUserRecordById(id: string) {
  if (await usePrisma()) {
    const user = await prismaStore.findUserById(id);
    return user ?? undefined;
  }
  return jsonStore.findUserRecordById(id);
}

export async function upsertOAuthUser(input: OAuthSyncRequest): Promise<User> {
  if (await usePrisma()) return prismaStore.upsertOAuthUser(input);
  return jsonStore.upsertOAuthUser(input);
}

export async function updateUser(
  id: string,
  patch: UpdateUserRequest
): Promise<User | null> {
  if (await usePrisma()) return prismaStore.updateUser(id, patch);
  return jsonStore.updateUser(id, patch);
}

export async function setCreatorStatus(
  id: string,
  status: CreatorStatus,
  role?: UserRole
): Promise<User | null> {
  if (await usePrisma()) return prismaStore.setCreatorStatus(id, status, role);
  return jsonStore.setCreatorStatus(id, status, role);
}

export async function setStripeConnect(
  id: string,
  accountId: string,
  chargesEnabled: boolean,
  payoutsEnabled: boolean
): Promise<User | null> {
  if (await usePrisma()) {
    return prismaStore.setStripeConnect(
      id,
      accountId,
      chargesEnabled,
      payoutsEnabled
    );
  }
  return jsonStore.setStripeConnect(
    id,
    accountId,
    chargesEnabled,
    payoutsEnabled
  );
}

export async function getPublicProfile(
  id: string
): Promise<PublicUserProfile | null> {
  if (await usePrisma()) return prismaStore.getPublicProfile(id);
  return jsonStore.getPublicProfile(id);
}

export function toPublicProfile(record: User): PublicUserProfile {
  return prismaStore.toPublicProfile(record);
}

export async function getAccountDeletionRequest(userId: string) {
  if (await usePrisma()) return prismaStore.getAccountDeletionRequest(userId);
  return jsonStore.getAccountDeletionRequest(userId);
}

export async function requestAccountDeletion(userId: string) {
  if (await usePrisma()) return prismaStore.requestAccountDeletion(userId);
  return jsonStore.requestAccountDeletion(userId);
}

export async function cancelAccountDeletion(userId: string) {
  if (await usePrisma()) return prismaStore.cancelAccountDeletion(userId);
  return jsonStore.cancelAccountDeletion(userId);
}
