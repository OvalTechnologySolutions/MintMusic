import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { artistsRouter } from './routes/artists.js';
import { healthRouter } from './routes/health.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use('/v1/artists', artistsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`MintMusic API listening on http://localhost:${config.port}`);
});
