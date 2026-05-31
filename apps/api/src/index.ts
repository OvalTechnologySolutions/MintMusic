import { createApp } from './app.js';
import { config } from './config/index.js';
import { disconnectPrisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`MintMusic API v${config.apiVersion} → http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/v1/health`);
});

process.on('SIGTERM', async () => {
  server.close();
  await disconnectPrisma();
  process.exit(0);
});
