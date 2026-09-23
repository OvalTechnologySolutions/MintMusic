import type { Prisma, PrismaClient, WalletLedgerType } from '@prisma/client';
import {
  SONG_SAVE_UNITS,
  mintUnitsToCents,
  mintUnitsToDisplay,
} from '../../config/billing.js';
import {
  AppError,
  ConflictError,
  InsufficientFundsError,
  NotFoundError,
  WalletDeficitError,
} from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';

type Tx = Prisma.TransactionClient;

async function lockWallet(tx: Tx, userId: string) {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      user_id: string;
      balance_units: number;
      version: number;
    }>
  >`SELECT id, user_id, balance_units, version FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

  if (rows[0]) {
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      balanceUnits: rows[0].balance_units,
      version: rows[0].version,
    };
  }

  const created = await tx.wallet.create({
    data: { userId, balanceUnits: 0 },
  });
  return {
    id: created.id,
    userId: created.userId,
    balanceUnits: created.balanceUnits,
    version: created.version,
  };
}

export async function ensureWallet(userId: string) {
  const db = await getPrisma();
  return db.wallet.upsert({
    where: { userId },
    create: { userId, balanceUnits: 0 },
    update: {},
  });
}

export async function getBlockingDeficitUnits(
  db: PrismaClient | Tx,
  userId: string
): Promise<number> {
  const open = await db.walletDeficit.aggregate({
    where: { userId, resolvedAt: null },
    _sum: { deficitUnits: true },
  });
  return open._sum.deficitUnits ?? 0;
}

export async function getWalletBalance(userId: string) {
  const db = await getPrisma();
  const wallet = await ensureWallet(userId);
  const deficitUnits = await getBlockingDeficitUnits(db, userId);
  return {
    balanceUnits: wallet.balanceUnits,
    balanceMint: mintUnitsToDisplay(wallet.balanceUnits),
    balanceUsdCents: mintUnitsToCents(wallet.balanceUnits),
    songSaveUnits: SONG_SAVE_UNITS,
    hasBlockingDeficit: deficitUnits > 0,
    deficitUnits,
  };
}

export async function listWalletTransactions(userId: string, limit = 50) {
  const db = await getPrisma();
  await ensureWallet(userId);
  const entries = await db.walletLedgerEntry.findMany({
    where: { userId, status: 'posted' },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
  });
  return entries.map((e) => ({
    id: e.id,
    type: e.type as WalletLedgerType,
    amountUnits: e.amountUnits,
    balanceAfterUnits: e.balanceAfterUnits,
    status: e.status,
    trackId: e.trackId ?? undefined,
    reason: e.reason ?? undefined,
    createdAt: e.createdAt.toISOString(),
  }));
}

export async function reconcileWallet(userId: string) {
  const db = await getPrisma();
  const wallet = await ensureWallet(userId);
  const sum = await db.walletLedgerEntry.aggregate({
    where: { walletId: wallet.id, status: 'posted' },
    _sum: { amountUnits: true },
  });
  const ledgerTotal = sum._sum.amountUnits ?? 0;
  return {
    balanceUnits: wallet.balanceUnits,
    ledgerTotal,
    inSync: wallet.balanceUnits === ledgerTotal,
  };
}

interface PostLedgerParams {
  tx: Tx;
  walletId: string;
  userId: string;
  type: WalletLedgerType;
  amountUnits: number;
  idempotencyKey: string;
  mintTopUpOrderId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  trackId?: string;
  entitlementId?: string;
  originalEntryId?: string;
  actorUserId?: string;
  reason?: string;
  auditMetadata?: Prisma.InputJsonValue;
  allowNegative?: boolean;
}

async function postLedgerEntry(params: PostLedgerParams) {
  const existing = await params.tx.walletLedgerEntry.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    return { entry: existing, created: false as const };
  }

  const wallet = await lockWallet(params.tx, params.userId);
  const nextBalance = wallet.balanceUnits + params.amountUnits;

  if (!params.allowNegative && nextBalance < 0) {
    throw new InsufficientFundsError(
      `Need ${Math.abs(params.amountUnits)} Mint units; balance is ${wallet.balanceUnits}`
    );
  }

  const entry = await params.tx.walletLedgerEntry.create({
    data: {
      walletId: wallet.id,
      userId: params.userId,
      type: params.type,
      amountUnits: params.amountUnits,
      balanceAfterUnits: nextBalance,
      status: 'posted',
      idempotencyKey: params.idempotencyKey,
      mintTopUpOrderId: params.mintTopUpOrderId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeChargeId: params.stripeChargeId,
      trackId: params.trackId,
      entitlementId: params.entitlementId,
      originalEntryId: params.originalEntryId,
      actorUserId: params.actorUserId,
      reason: params.reason,
      auditMetadata: params.auditMetadata,
    },
  });

  await params.tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balanceUnits: nextBalance,
      version: { increment: 1 },
    },
  });

  return { entry, created: true as const, balanceUnits: nextBalance, walletId: wallet.id };
}

export async function creditMintPurchase(params: {
  userId: string;
  amountUnits: number;
  idempotencyKey: string;
  mintTopUpOrderId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  auditMetadata?: Prisma.InputJsonValue;
}) {
  if (params.amountUnits <= 0) {
    throw new AppError('Credit amount must be positive', 400);
  }

  const db = await getPrisma();
  return db.$transaction(async (tx) => {
    const result = await postLedgerEntry({
      tx,
      walletId: '', // resolved inside lock
      userId: params.userId,
      type: 'purchase',
      amountUnits: params.amountUnits,
      idempotencyKey: params.idempotencyKey,
      mintTopUpOrderId: params.mintTopUpOrderId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeChargeId: params.stripeChargeId,
      auditMetadata: params.auditMetadata,
    });
    return result;
  });
}

export async function debitSongSave(params: {
  userId: string;
  trackId: string;
  idempotencyKey: string;
  amountUnits?: number;
}) {
  const amount = params.amountUnits ?? SONG_SAVE_UNITS;
  const db = await getPrisma();

  return db.$transaction(async (tx) => {
    const deficit = await getBlockingDeficitUnits(tx, params.userId);
    if (deficit > 0) {
      throw new WalletDeficitError();
    }

    const result = await postLedgerEntry({
      tx,
      walletId: '',
      userId: params.userId,
      type: 'song_save',
      amountUnits: -amount,
      idempotencyKey: params.idempotencyKey,
      trackId: params.trackId,
    });

    return result;
  });
}

/**
 * Compensating credit/debit for refunds and disputes.
 * amountUnits should be negative to reverse a prior purchase credit.
 */
export async function applyCompensatingEntry(params: {
  userId: string;
  amountUnits: number;
  type: 'refund' | 'reversal';
  idempotencyKey: string;
  originalEntryId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  reason: string;
  auditMetadata?: Prisma.InputJsonValue;
}) {
  const db = await getPrisma();

  return db.$transaction(async (tx) => {
    const result = await postLedgerEntry({
      tx,
      walletId: '',
      userId: params.userId,
      type: params.type,
      amountUnits: params.amountUnits,
      idempotencyKey: params.idempotencyKey,
      originalEntryId: params.originalEntryId,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeChargeId: params.stripeChargeId,
      reason: params.reason,
      auditMetadata: params.auditMetadata,
      allowNegative: true,
    });

    if (result.created && (result.balanceUnits ?? 0) < 0) {
      const deficitUnits = Math.abs(result.balanceUnits!);
      await tx.walletDeficit.create({
        data: {
          walletId: result.walletId!,
          userId: params.userId,
          deficitUnits,
          reason: params.reason,
          relatedLedgerId: result.entry.id,
        },
      });
      // Normalize displayed balance to 0 while deficit tracks the remainder.
      await tx.wallet.update({
        where: { id: result.walletId! },
        data: { balanceUnits: 0 },
      });
      await tx.walletLedgerEntry.update({
        where: { id: result.entry.id },
        data: { balanceAfterUnits: 0 },
      });
    }

    return result;
  });
}

export async function authorizedAdjustment(params: {
  userId: string;
  amountUnits: number;
  idempotencyKey: string;
  actorUserId: string;
  reason: string;
  auditMetadata?: Prisma.InputJsonValue;
}) {
  if (!params.reason.trim()) {
    throw new AppError('Adjustment reason required', 400);
  }
  const db = await getPrisma();
  return db.$transaction(async (tx) => {
    return postLedgerEntry({
      tx,
      walletId: '',
      userId: params.userId,
      type: 'adjustment',
      amountUnits: params.amountUnits,
      idempotencyKey: params.idempotencyKey,
      actorUserId: params.actorUserId,
      reason: params.reason,
      auditMetadata: params.auditMetadata,
      allowNegative: params.amountUnits < 0,
    });
  });
}

export async function assertNoDuplicateIdempotency(key: string) {
  const db = await getPrisma();
  const existing = await db.walletLedgerEntry.findUnique({
    where: { idempotencyKey: key },
  });
  if (existing) throw new ConflictError('Duplicate idempotency key');
}
