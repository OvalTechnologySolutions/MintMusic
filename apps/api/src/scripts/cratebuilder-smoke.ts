import { getPrisma, disconnectPrisma } from '../lib/prisma.js';
import { importArtistRows } from '../modules/cratebuilder/import.js';
import {
  exportWorkbookForRun,
  readExportBuffer,
} from '../modules/cratebuilder/export.js';
import { runCrateBuilderPipeline } from '../modules/cratebuilder/pipeline.js';
import { syncConnectorStatuses } from '../modules/cratebuilder/connectors.js';
import ExcelJS from 'exceljs';

async function main() {
  const db = await getPrisma();
  await syncConnectorStatuses(db);

  const imp = await importArtistRows(db, [
    {
      stageName: 'CrateBuilder Demo Solo',
      entityType: 'solo',
      genres: ['indie'],
      website: 'https://example.com',
      profiles: [{ platform: 'instagram', url: 'https://instagram.com/cbdemo' }],
      contacts: [{ kind: 'booking', value: 'booking@example.com' }],
      sourceUrl: 'manual://test',
    },
    {
      stageName: 'CrateBuilder Demo Group',
      entityType: 'group',
      genres: ['electronic'],
    },
  ]);
  console.log('import', imp);

  const snap = await db.cbIngestionRun.create({
    data: {
      status: 'completed',
      trigger: 'export_only',
      startedAt: new Date(),
      completedAt: new Date(),
      summaryJson: { note: 'manual_verify' },
    },
  });
  const exp = await exportWorkbookForRun(db, snap.id, { partial: false });
  console.log('export', exp);
  const buf = await readExportBuffer(exp.storageKey);
  if (!buf) throw new Error('missing export buffer');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  console.log(
    'sheets',
    wb.worksheets.map((s) => s.name)
  );
  console.log('artistsRows', (wb.getWorksheet('Artists')?.rowCount ?? 0) - 1);

  const result = await runCrateBuilderPipeline(db, {
    trigger: 'manual',
    skipExport: false,
  });
  console.log('pipeline', result.status, JSON.stringify(result.summary).slice(0, 800));

  await disconnectPrisma();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectPrisma();
  process.exit(1);
});
