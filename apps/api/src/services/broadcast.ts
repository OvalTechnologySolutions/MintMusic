import { getPrisma } from '../lib/prisma.js';

/** Returns true when an active broadcast license covers the region */
export async function isRegionLicensed(regionCode: string): Promise<boolean> {
  const db = await getPrisma();
  const now = new Date();
  const license = await db.broadcastLicense.findFirst({
    where: {
      regionCode: regionCode.toUpperCase(),
      active: true,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
  });
  return Boolean(license);
}

export async function listLicensedRegions() {
  const db = await getPrisma();
  const now = new Date();
  const licenses = await db.broadcastLicense.findMany({
    where: {
      active: true,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
    orderBy: { regionCode: 'asc' },
  });

  const byRegion = new Map<
    string,
    {
      regionCode: string;
      name: string;
      licenseTypes: string[];
      territories: string[];
    }
  >();

  for (const lic of licenses) {
    const existing = byRegion.get(lic.regionCode);
    if (existing) {
      existing.licenseTypes.push(lic.licenseType);
      existing.territories = [
        ...new Set([...existing.territories, ...lic.territories]),
      ];
    } else {
      byRegion.set(lic.regionCode, {
        regionCode: lic.regionCode,
        name: lic.name,
        licenseTypes: [lic.licenseType],
        territories: [...lic.territories],
      });
    }
  }

  return [...byRegion.values()].map((r) => ({
    ...r,
    licensed: true,
  }));
}

/** Add release to regional discovery channel rotation (auto-approved opt-in) */
export async function activateRadioRotation(
  releaseId: string,
  regionCode: string
): Promise<void> {
  const db = await getPrisma();
  const channel = await db.discoveryChannel.findFirst({
    where: { regionCode: regionCode.toUpperCase(), active: true },
  });
  if (!channel) return;

  await db.radioRotation.create({
    data: {
      channelId: channel.id,
      releaseId,
      weight: 1,
      startsAt: new Date(),
    },
  });
}
