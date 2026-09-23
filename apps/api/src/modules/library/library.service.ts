import { createHash, randomBytes } from 'node:crypto';
import { SONG_SAVE_UNITS, offlineLeaseSeconds } from '../../config/billing.js';
import {
  AppError,
  ForbiddenError,
  InsufficientFundsError,
  NotFoundError,
  WalletDeficitError,
} from '../../lib/errors.js';
import { getPrisma } from '../../lib/prisma.js';
import {
  ensureWallet,
  getBlockingDeficitUnits,
  getWalletBalance,
} from '../wallet/wallet.service.js';

export async function isTrackSaveEligible(trackId: string) {
  const db = await getPrisma();
  const track = await db.track.findUnique({
    where: { id: trackId },
    include: {
      release: true,
      mediaAsset: true,
    },
  });
  if (!track) return null;
  const eligible =
    track.release.published &&
    track.release.saveEligible &&
    track.saveEligible &&
    track.mediaAsset.processingStatus === 'ready';
  return { track, eligible };
}

export async function saveSong(params: {
  userId: string;
  trackId: string;
  idempotencyKey: string;
}) {
  if (!params.idempotencyKey?.trim()) {
    throw new AppError('idempotencyKey is required', 400);
  }

  const check = await isTrackSaveEligible(params.trackId);
  if (!check) throw new NotFoundError('Track not found');
  if (!check.eligible) {
    throw new ForbiddenError(
      'This track is not available for paid save on MintMusic'
    );
  }

  const db = await getPrisma();
  await ensureWallet(params.userId);

  const existing = await db.songEntitlement.findUnique({
    where: {
      userId_trackId: { userId: params.userId, trackId: params.trackId },
    },
  });

  if (existing) {
    const libraryItem = await db.libraryItem.upsert({
      where: {
        userId_trackId: { userId: params.userId, trackId: params.trackId },
      },
      create: {
        userId: params.userId,
        trackId: params.trackId,
        visible: true,
      },
      update: { visible: true },
    });
    const balance = await getWalletBalance(params.userId);
    return {
      charged: false,
      amountUnits: 0,
      balanceUnits: balance.balanceUnits,
      entitlementId: existing.id,
      libraryItemId: libraryItem.id,
      alreadyOwned: true,
    };
  }

  // Atomic path: debit + entitlement + library in one transaction via nested ops
  try {
    const result = await db.$transaction(async (tx) => {
      const deficit = await getBlockingDeficitUnits(tx, params.userId);
      if (deficit > 0) throw new WalletDeficitError();

      // Re-check entitlement inside tx
      const again = await tx.songEntitlement.findUnique({
        where: {
          userId_trackId: { userId: params.userId, trackId: params.trackId },
        },
      });
      if (again) {
        const libraryItem = await tx.libraryItem.upsert({
          where: {
            userId_trackId: { userId: params.userId, trackId: params.trackId },
          },
          create: {
            userId: params.userId,
            trackId: params.trackId,
            visible: true,
          },
          update: { visible: true },
        });
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { userId: params.userId },
        });
        return {
          charged: false,
          amountUnits: 0,
          balanceUnits: wallet.balanceUnits,
          entitlementId: again.id,
          libraryItemId: libraryItem.id,
          alreadyOwned: true,
        };
      }

      const walletRows = await tx.$queryRaw<
        Array<{ id: string; balance_units: number }>
      >`SELECT id, balance_units FROM wallets WHERE user_id = ${params.userId} FOR UPDATE`;

      let walletId = walletRows[0]?.id;
      let balance = walletRows[0]?.balance_units ?? 0;
      if (!walletId) {
        const w = await tx.wallet.create({
          data: { userId: params.userId, balanceUnits: 0 },
        });
        walletId = w.id;
        balance = 0;
      }

      if (balance < SONG_SAVE_UNITS) {
        throw new InsufficientFundsError(
          `Need ${SONG_SAVE_UNITS} Mint units; balance is ${balance}`
        );
      }

      const existingLedger = await tx.walletLedgerEntry.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existingLedger) {
        const ent = await tx.songEntitlement.findUnique({
          where: {
            userId_trackId: { userId: params.userId, trackId: params.trackId },
          },
        });
        const lib = await tx.libraryItem.findUnique({
          where: {
            userId_trackId: { userId: params.userId, trackId: params.trackId },
          },
        });
        if (ent && lib) {
          return {
            charged: existingLedger.type === 'song_save',
            amountUnits: existingLedger.type === 'song_save' ? SONG_SAVE_UNITS : 0,
            balanceUnits: existingLedger.balanceAfterUnits,
            entitlementId: ent.id,
            libraryItemId: lib.id,
            alreadyOwned: existingLedger.type !== 'song_save',
          };
        }
      }

      const nextBalance = balance - SONG_SAVE_UNITS;
      const ledger = await tx.walletLedgerEntry.create({
        data: {
          walletId,
          userId: params.userId,
          type: 'song_save',
          amountUnits: -SONG_SAVE_UNITS,
          balanceAfterUnits: nextBalance,
          status: 'posted',
          idempotencyKey: params.idempotencyKey,
          trackId: params.trackId,
        },
      });

      await tx.wallet.update({
        where: { id: walletId },
        data: { balanceUnits: nextBalance, version: { increment: 1 } },
      });

      const entitlement = await tx.songEntitlement.create({
        data: {
          userId: params.userId,
          trackId: params.trackId,
          source: 'mint_save',
          ledgerEntryId: ledger.id,
        },
      });

      await tx.walletLedgerEntry.update({
        where: { id: ledger.id },
        data: { entitlementId: entitlement.id },
      });

      const libraryItem = await tx.libraryItem.create({
        data: {
          userId: params.userId,
          trackId: params.trackId,
          visible: true,
        },
      });

      return {
        charged: true,
        amountUnits: SONG_SAVE_UNITS,
        balanceUnits: nextBalance,
        entitlementId: entitlement.id,
        libraryItemId: libraryItem.id,
        alreadyOwned: false,
      };
    });

    return result;
  } catch (err) {
    // Unique constraint race on entitlement → treat as already owned
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      const ent = await db.songEntitlement.findUnique({
        where: {
          userId_trackId: { userId: params.userId, trackId: params.trackId },
        },
      });
      if (ent) {
        const libraryItem = await db.libraryItem.upsert({
          where: {
            userId_trackId: { userId: params.userId, trackId: params.trackId },
          },
          create: {
            userId: params.userId,
            trackId: params.trackId,
            visible: true,
          },
          update: { visible: true },
        });
        const balance = await getWalletBalance(params.userId);
        return {
          charged: false,
          amountUnits: 0,
          balanceUnits: balance.balanceUnits,
          entitlementId: ent.id,
          libraryItemId: libraryItem.id,
          alreadyOwned: true,
        };
      }
    }
    throw err;
  }
}

export async function hideLibraryItem(userId: string, trackId: string) {
  const db = await getPrisma();
  const item = await db.libraryItem.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });
  if (!item) throw new NotFoundError('Library item not found');
  return db.libraryItem.update({
    where: { id: item.id },
    data: { visible: false },
  });
}

export async function restoreLibraryItem(userId: string, trackId: string) {
  const db = await getPrisma();
  const entitlement = await db.songEntitlement.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });
  if (!entitlement) {
    throw new ForbiddenError('No entitlement for this track; save required');
  }
  return db.libraryItem.upsert({
    where: { userId_trackId: { userId, trackId } },
    create: { userId, trackId, visible: true },
    update: { visible: true },
  });
}

export async function listLibrary(userId: string, includeHidden = false) {
  const db = await getPrisma();
  const items = await db.libraryItem.findMany({
    where: {
      userId,
      ...(includeHidden ? {} : { visible: true }),
    },
    orderBy: { addedAt: 'desc' },
    include: {
      track: {
        include: {
          release: {
            include: { creator: { select: { name: true } } },
          },
        },
      },
    },
  });

  const entitlements = await db.songEntitlement.findMany({
    where: { userId },
  });
  const entByTrack = new Map(entitlements.map((e) => [e.trackId, e]));

  return items.map((item) => {
    const ent = entByTrack.get(item.trackId);
    return {
      trackId: item.trackId,
      releaseId: item.track.releaseId,
      title: item.track.title,
      releaseTitle: item.track.release.title,
      creatorName: item.track.release.creator.name,
      coverUrl: item.track.release.coverUrl ?? undefined,
      durationMs: item.track.durationMs ?? undefined,
      entitled: Boolean(ent),
      visible: item.visible,
      source: ent?.source ?? 'unknown',
      addedAt: item.addedAt.toISOString(),
    };
  });
}

export async function userHasTrackAccess(userId: string, trackId: string) {
  const db = await getPrisma();
  const entitlement = await db.songEntitlement.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });
  if (entitlement) return true;

  const track = await db.track.findUnique({ where: { id: trackId } });
  if (!track) return false;

  const purchase = await db.purchase.findUnique({
    where: {
      collectorId_releaseId: {
        collectorId: userId,
        releaseId: track.releaseId,
      },
    },
  });
  return Boolean(purchase);
}

export async function createOfflineLease(userId: string, deviceId: string) {
  const db = await getPrisma();
  const deviceIdHash = createHash('sha256').update(deviceId).digest('hex');
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const leaseSeconds = offlineLeaseSeconds();
  const expiresAt = new Date(Date.now() + leaseSeconds * 1000);

  await db.offlineAuthLease.create({
    data: {
      userId,
      deviceIdHash,
      tokenHash,
      expiresAt,
    },
  });

  return {
    leaseToken: `${userId}.${rawToken}`,
    expiresAt: expiresAt.toISOString(),
    leaseSeconds,
  };
}

export async function revokeOfflineLeases(userId: string) {
  const db = await getPrisma();
  await db.offlineAuthLease.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function validateOfflineLease(leaseToken: string): Promise<{
  userId: string;
  valid: boolean;
}> {
  const [userId, raw] = leaseToken.split('.');
  if (!userId || !raw) return { userId: '', valid: false };
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const db = await getPrisma();
  const lease = await db.offlineAuthLease.findFirst({
    where: {
      userId,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return { userId, valid: Boolean(lease) };
}

/** Backfill entitlements from legacy Purchase rows (no Mint charge). */
export async function migrateLegacyPurchasesToEntitlements() {
  const db = await getPrisma();
  const purchases = await db.purchase.findMany({
    include: { release: { include: { tracks: true } } },
  });
  let created = 0;
  for (const p of purchases) {
    for (const track of p.release.tracks) {
      const ent = await db.songEntitlement.upsert({
        where: {
          userId_trackId: { userId: p.collectorId, trackId: track.id },
        },
        create: {
          userId: p.collectorId,
          trackId: track.id,
          source: 'legacy_purchase',
        },
        update: {},
      });
      await db.libraryItem.upsert({
        where: {
          userId_trackId: { userId: p.collectorId, trackId: track.id },
        },
        create: {
          userId: p.collectorId,
          trackId: track.id,
          visible: true,
        },
        update: {},
      });
      if (ent.source === 'legacy_purchase') created += 1;
    }
  }
  return { purchases: purchases.length, entitlementsTouched: created };
}
