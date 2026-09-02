import { env, isDatabaseConfigured } from '../config/env.js';

let prisma: import('@prisma/client').PrismaClient | null = null;

export async function getPrisma() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/** Health check helper */
export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    const db = await getPrisma();
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { env };
