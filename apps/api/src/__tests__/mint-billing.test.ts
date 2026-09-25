/**
 * Mint billing acceptance tests.
 * Requires DATABASE_URL (local Postgres). Stripe is mocked.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Mint billing', () => {
  let prisma: Awaited<ReturnType<typeof import('../lib/prisma.js').getPrisma>>;
  let userA: string;
  let userB: string;
  let trackIds: string[] = [];
  let releaseId: string;

  beforeAll(async () => {
    const { getPrisma } = await import('../lib/prisma.js');
    prisma = await getPrisma();
  });

  beforeEach(async () => {
    // Clean billing tables for isolation
    await prisma.walletLedgerEntry.deleteMany({});
    await prisma.walletDeficit.deleteMany({});
    await prisma.mintTopUpOrder.deleteMany({});
    await prisma.libraryItem.deleteMany({});
    await prisma.songEntitlement.deleteMany({});
    await prisma.artistIntroOfferRedemption.deleteMany({});
    await prisma.artistSubscription.deleteMany({});
    await prisma.processedStripeEvent.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.playbackSession.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.track.deleteMany({});
    await prisma.release.deleteMany({});
    await prisma.mediaAsset.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['listener-a@test.mint', 'listener-b@test.mint', 'artist-a@test.mint'] } },
    });

    const artist = await prisma.user.create({
      data: {
        email: 'artist-a@test.mint',
        name: 'Artist A',
        provider: 'test',
        providerAccountId: 'artist-a',
        role: 'creator',
        creatorStatus: 'approved',
        artistIntroOfferEligible: true,
      },
    });

    const a = await prisma.user.create({
      data: {
        email: 'listener-a@test.mint',
        name: 'Listener A',
        provider: 'test',
        providerAccountId: 'listener-a',
        wallet: { create: { balanceUnits: 0 } },
      },
    });
    const b = await prisma.user.create({
      data: {
        email: 'listener-b@test.mint',
        name: 'Listener B',
        provider: 'test',
        providerAccountId: 'listener-b',
        wallet: { create: { balanceUnits: 0 } },
      },
    });
    userA = a.id;
    userB = b.id;

    const asset = await prisma.mediaAsset.create({
      data: {
        creatorId: artist.id,
        filename: 'demo.mp3',
        mimeType: 'audio/mpeg',
        format: 'mp3',
        byteSize: BigInt(1024),
        storageKey: `uploads/${artist.id}/demo.mp3`,
        processingStatus: 'ready',
      },
    });

    const release = await prisma.release.create({
      data: {
        creatorId: artist.id,
        mediaAssetId: asset.id,
        type: 'single',
        title: 'Saveable Single',
        priceCents: 0,
        published: true,
        publishedAt: new Date(),
        saveEligible: true,
        tracks: {
          create: [
            {
              title: 'Track One',
              trackNumber: 1,
              mediaAssetId: asset.id,
              saveEligible: true,
              durationMs: 30_000,
            },
            {
              title: 'Track Two',
              trackNumber: 2,
              mediaAssetId: asset.id,
              saveEligible: true,
              durationMs: 30_000,
            },
          ],
        },
      },
      include: { tracks: true },
    });
    releaseId = release.id;
    trackIds = release.tracks.map((t) => t.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects top-ups below $5 server-side', async () => {
    const { validateTopUpAmountCents } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    expect(() => validateTopUpAmountCents(499)).toThrow(/Minimum/);
  });

  it('credits $5/$10/$25 purchases to correct balances', async () => {
    const { creditMintPurchase, getWalletBalance } = await import(
      '../modules/wallet/wallet.service.js'
    );
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );

    for (const cents of [500, 1000, 2500]) {
      const order = await createMintTopUpOrder(userA, cents);
      await creditMintPurchase({
        userId: userA,
        amountUnits: cents,
        idempotencyKey: `test-topup-${cents}`,
        mintTopUpOrderId: order.id,
      });
    }
    const bal = await getWalletBalance(userA);
    expect(bal.balanceUnits).toBe(500 + 1000 + 2500);
  });

  it('duplicate payment events credit once', async () => {
    const { creditMintPurchase, getWalletBalance } = await import(
      '../modules/wallet/wallet.service.js'
    );
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const order = await createMintTopUpOrder(userA, 500);
    const key = `mint_topup:${order.id}`;
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: key,
      mintTopUpOrderId: order.id,
    });
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: key,
      mintTopUpOrderId: order.id,
    });
    const bal = await getWalletBalance(userA);
    expect(bal.balanceUnits).toBe(500);
  });

  it('25-unit balance buys one song and becomes zero; 24 cannot', async () => {
    const { creditMintPurchase, getWalletBalance } = await import(
      '../modules/wallet/wallet.service.js'
    );
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const { saveSong } = await import('../modules/library/library.service.js');

    const order = await createMintTopUpOrder(userA, 500);
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: 'seed-25',
      mintTopUpOrderId: order.id,
    });
    await prisma.wallet.update({
      where: { userId: userA },
      data: { balanceUnits: 25 },
    });

    const saved = await saveSong({
      userId: userA,
      trackId: trackIds[0],
      idempotencyKey: 'save-1',
    });
    expect(saved.charged).toBe(true);
    expect(saved.balanceUnits).toBe(0);

    await prisma.wallet.update({
      where: { userId: userA },
      data: { balanceUnits: 24 },
    });
    await expect(
      saveSong({
        userId: userA,
        trackId: trackIds[1],
        idempotencyKey: 'save-2',
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });

    const bal = await getWalletBalance(userA);
    expect(bal.balanceUnits).toBe(24);
  });

  it('concurrent saves cannot overspend or double-charge same track', async () => {
    const { creditMintPurchase } = await import('../modules/wallet/wallet.service.js');
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const { saveSong } = await import('../modules/library/library.service.js');

    const order = await createMintTopUpOrder(userA, 500);
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: 'seed-50',
      mintTopUpOrderId: order.id,
    });
    await prisma.wallet.update({
      where: { userId: userA },
      data: { balanceUnits: 50 },
    });

    const same = await Promise.all([
      saveSong({ userId: userA, trackId: trackIds[0], idempotencyKey: 'c-a' }),
      saveSong({ userId: userA, trackId: trackIds[0], idempotencyKey: 'c-b' }),
    ]);
    const charged = same.filter((s) => s.charged).length;
    expect(charged).toBe(1);
    const ents = await prisma.songEntitlement.count({
      where: { userId: userA, trackId: trackIds[0] },
    });
    expect(ents).toBe(1);

    await prisma.wallet.update({
      where: { userId: userA },
      data: { balanceUnits: 25 },
    });
    await Promise.allSettled([
      saveSong({ userId: userA, trackId: trackIds[0], idempotencyKey: 'd1' }),
      saveSong({ userId: userA, trackId: trackIds[1], idempotencyKey: 'd2' }),
      saveSong({
        userId: userA,
        trackId: trackIds[1],
        idempotencyKey: 'd3',
      }),
    ]);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: userA } });
    expect(wallet.balanceUnits).toBeGreaterThanOrEqual(0);
    expect(wallet.balanceUnits).toBeLessThanOrEqual(25);
  });

  it('removing and re-adding an entitled song is free', async () => {
    const { creditMintPurchase, getWalletBalance } = await import(
      '../modules/wallet/wallet.service.js'
    );
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const {
      saveSong,
      hideLibraryItem,
      restoreLibraryItem,
    } = await import('../modules/library/library.service.js');

    const order = await createMintTopUpOrder(userA, 500);
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: 'seed-500',
      mintTopUpOrderId: order.id,
    });
    await saveSong({
      userId: userA,
      trackId: trackIds[0],
      idempotencyKey: 's1',
    });
    const afterSave = await getWalletBalance(userA);
    await hideLibraryItem(userA, trackIds[0]);
    await restoreLibraryItem(userA, trackIds[0]);
    const again = await saveSong({
      userId: userA,
      trackId: trackIds[0],
      idempotencyKey: 's1-again',
    });
    expect(again.charged).toBe(false);
    expect(again.alreadyOwned).toBe(true);
    const bal = await getWalletBalance(userA);
    expect(bal.balanceUnits).toBe(afterSave.balanceUnits);
  });

  it('another user cannot access entitlements', async () => {
    const { creditMintPurchase } = await import('../modules/wallet/wallet.service.js');
    const { createMintTopUpOrder } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const { saveSong, userHasTrackAccess } = await import(
      '../modules/library/library.service.js'
    );
    const order = await createMintTopUpOrder(userA, 500);
    await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: 'seed-x',
      mintTopUpOrderId: order.id,
    });
    await saveSong({
      userId: userA,
      trackId: trackIds[0],
      idempotencyKey: 'own',
    });
    expect(await userHasTrackAccess(userA, trackIds[0])).toBe(true);
    expect(await userHasTrackAccess(userB, trackIds[0])).toBe(false);
  });

  it('refunds create compensating entries and deficit when spent', async () => {
    const { creditMintPurchase, getWalletBalance } = await import(
      '../modules/wallet/wallet.service.js'
    );
    const { createMintTopUpOrder, reverseTopUpByCharge } = await import(
      '../modules/wallet/mint-topup.service.js'
    );
    const { saveSong } = await import('../modules/library/library.service.js');

    const order = await createMintTopUpOrder(userA, 500);
    const credit = await creditMintPurchase({
      userId: userA,
      amountUnits: 500,
      idempotencyKey: `mint_topup:${order.id}`,
      mintTopUpOrderId: order.id,
      stripeChargeId: 'ch_test_1',
      stripePaymentIntentId: 'pi_test_1',
    });
    await prisma.mintTopUpOrder.update({
      where: { id: order.id },
      data: {
        status: 'succeeded',
        stripeChargeId: 'ch_test_1',
        stripePaymentIntentId: 'pi_test_1',
        creditedLedgerEntryId: credit.entry.id,
      },
    });

    await saveSong({
      userId: userA,
      trackId: trackIds[0],
      idempotencyKey: 'spend',
    });

    await reverseTopUpByCharge({
      chargeId: 'ch_test_1',
      paymentIntentId: 'pi_test_1',
      amountCents: 500,
      reason: 'test_refund',
      idempotencyKey: 'refund:ch_test_1:500',
      type: 'refund',
    });

    const bal = await getWalletBalance(userA);
    expect(bal.hasBlockingDeficit).toBe(true);
    await expect(
      saveSong({
        userId: userA,
        trackId: trackIds[1],
        idempotencyKey: 'blocked',
      })
    ).rejects.toMatchObject({ code: 'WALLET_DEFICIT' });
  });

  it('legacy purchases migrate to entitlements without Mint charge', async () => {
    await prisma.purchase.create({
      data: {
        collectorId: userB,
        releaseId,
        amountCents: 999,
        stripePaymentId: 'pi_legacy',
      },
    });
    const { migrateLegacyPurchasesToEntitlements } = await import(
      '../modules/library/library.service.js'
    );
    await migrateLegacyPurchasesToEntitlements();
    const ents = await prisma.songEntitlement.findMany({
      where: { userId: userB },
    });
    expect(ents.length).toBe(trackIds.length);
    expect(ents.every((e) => e.source === 'legacy_purchase')).toBe(true);
    const wallet = await prisma.wallet.findUnique({ where: { userId: userB } });
    expect(wallet?.balanceUnits ?? 0).toBe(0);
  });

  it('intro offer can be redeemed once and survives profile delete simulation', async () => {
    const artist = await prisma.user.findUniqueOrThrow({
      where: { email: 'artist-a@test.mint' },
    });

    const billing = await import('../config/billing.js');
    vi.spyOn(billing, 'artistPriceId').mockReturnValue('price_test_artist');

    const mockStripe = {
      customers: {
        create: vi.fn(async () => ({ id: 'cus_test' })),
      },
      subscriptions: {
        create: vi.fn(async () => ({
          id: 'sub_test',
          status: 'trialing',
          trial_end: Math.floor(Date.now() / 1000) + 86400 * 365,
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 365,
          cancel_at_period_end: false,
          metadata: {},
        })),
        cancel: vi.fn(async () => ({})),
      },
    };

    const { activateIntroOffer, getArtistSubscriptionStatus } = await import(
      '../modules/artist/subscription.service.js'
    );

    const status1 = await activateIntroOffer(artist.id, mockStripe as never);
    expect(status1.introOfferRedeemed).toBe(true);
    expect(status1.accessActive).toBe(true);

    await expect(
      activateIntroOffer(artist.id, mockStripe as never)
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    await prisma.creatorProfile.deleteMany({ where: { userId: artist.id } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: artist.id } });
    expect(user.artistIntroOfferRedeemedAt).toBeTruthy();
    expect(user.artistIntroOfferEligible).toBe(false);

    const status2 = await getArtistSubscriptionStatus(artist.id);
    expect(status2.introOfferEligible).toBe(false);
    expect(status2.introOfferRedeemed).toBe(true);
  });
});

describe('billing config constants', () => {
  it('uses sprint assumptions', async () => {
    const {
      ARTIST_SUBSCRIPTION_PRICE_CENTS,
      SONG_SAVE_UNITS,
      MINT_TOPUP_MIN_CENTS,
      centsToMintUnits,
    } = await import('../config/billing.js');
    expect(ARTIST_SUBSCRIPTION_PRICE_CENTS).toBe(999);
    expect(SONG_SAVE_UNITS).toBe(25);
    expect(MINT_TOPUP_MIN_CENTS).toBe(500);
    expect(centsToMintUnits(500)).toBe(500);
  });
});
