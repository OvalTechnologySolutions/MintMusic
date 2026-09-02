import type {
  CreatorApplication,
  SubmitCreatorApplicationRequest,
} from '@mintmusic/shared';
import { readJson, writeJson } from './json-db.js';
import { findUserById, setCreatorStatus } from './users.js';

const FILE = 'creator-applications.json';

async function load(): Promise<CreatorApplication[]> {
  return readJson<CreatorApplication[]>(FILE, []);
}

async function save(apps: CreatorApplication[]): Promise<void> {
  await writeJson(FILE, apps);
}

function newId(): string {
  return `cap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function getApplicationByUserId(
  userId: string
): Promise<CreatorApplication | undefined> {
  const apps = await load();
  return apps.find((a) => a.userId === userId);
}

export async function submitApplication(
  userId: string,
  input: SubmitCreatorApplicationRequest
): Promise<CreatorApplication> {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');

  const apps = await load();
  const existing = apps.find((a) => a.userId === userId);
  if (existing && existing.status === 'pending') {
    throw new Error('Application already pending review');
  }
  if (user.creatorStatus === 'approved') {
    throw new Error('Already an approved creator');
  }

  const now = new Date().toISOString();
  const application: CreatorApplication = {
    id: newId(),
    userId,
    artistName: input.artistName.trim(),
    genre: input.genre.trim(),
    bio: input.bio.trim(),
    portfolioUrl: input.portfolioUrl?.trim(),
    whyJoin: input.whyJoin.trim(),
    status: 'pending',
    submittedAt: now,
  };

  apps.push(application);
  await save(apps);
  await setCreatorStatus(userId, 'pending');

  return application;
}
