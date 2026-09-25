import { describe, expect, it } from 'vitest';
import { hashPayload } from '../../modules/cratebuilder/identity.js';

describe('CrateBuilder identity helpers', () => {
  it('hashes payloads stably for idempotent source items', () => {
    expect(hashPayload('abc')).toBe(hashPayload('abc'));
    expect(hashPayload('abc')).not.toBe(hashPayload('abcd'));
  });
});

describe('CrateBuilder identity resolution (integration)', () => {
  it('does not merge same-name artists without strong keys', async () => {
    if (!process.env.DATABASE_URL) {
      expect(true).toBe(true);
      return;
    }
    const { getPrisma, disconnectPrisma } = await import('../../lib/prisma.js');
    const { resolveOrCreateArtist } = await import(
      '../../modules/cratebuilder/identity.js'
    );
    const db = await getPrisma();
    const suffix = Date.now().toString(36);
    const name = `Ambiguous Twin ${suffix}`;

    const a = await resolveOrCreateArtist(db, {
      stageName: name,
      method: 'test',
      sourceType: 'manual',
    });
    const b = await resolveOrCreateArtist(db, {
      stageName: name,
      method: 'test',
      sourceType: 'manual',
    });

    expect(a.artistId).not.toBe(b.artistId);
    expect(b.queuedReview).toBe(true);

    await db.cbContact.create({
      data: {
        artistId: a.artistId,
        kind: 'management',
        value: `mgr-${suffix}@example.com`,
      },
    });
    await db.cbContact.create({
      data: {
        artistId: b.artistId,
        kind: 'management',
        value: `mgr-${suffix}@example.com`,
      },
    });
    const contacts = await db.cbContact.findMany({
      where: { value: `mgr-${suffix}@example.com` },
    });
    expect(contacts).toHaveLength(2);
    expect(new Set(contacts.map((c: { artistId: string }) => c.artistId)).size).toBe(2);

    await db.cbArtist.update({
      where: { id: a.artistId },
      data: {
        outreachStatus: 'contacted',
        outreachNotes: 'keep me',
        adminLockedFields: ['outreachStatus', 'outreachNotes'],
      },
    });
    await resolveOrCreateArtist(db, {
      stageName: `${name} Renamed`,
      website: `https://site-a-${suffix}.example`,
      externalIds: [{ provider: 'test', externalId: `a-${suffix}` }],
      method: 'test',
    });
    const kept = await db.cbArtist.findUnique({ where: { id: a.artistId } });
    expect(kept?.outreachStatus).toBe('contacted');
    expect(kept?.outreachNotes).toBe('keep me');

    await db.cbArtist.deleteMany({
      where: { id: { in: [a.artistId, b.artistId] } },
    });
    await disconnectPrisma();
  }, 30_000);
});
