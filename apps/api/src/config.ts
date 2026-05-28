import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  apiVersion: process.env.API_VERSION ?? '0.1.0',
} as const;
