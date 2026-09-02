import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { env } from '../../config/env.js';
import { ServiceUnavailableError } from '../errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const SALT = 'mintmusic-taste-v1';

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

export function isEncryptionConfigured(): boolean {
  return Boolean(env.TASTE_TOKEN_ENCRYPTION_KEY && env.TASTE_TOKEN_ENCRYPTION_KEY.length >= 32);
}

function requireKey(): string {
  if (!isEncryptionConfigured()) {
    throw new ServiceUnavailableError(
      'TASTE_TOKEN_ENCRYPTION_KEY is not configured (min 32 chars)'
    );
  }
  return env.TASTE_TOKEN_ENCRYPTION_KEY!;
}

/** AES-256-GCM encrypt — format: iv:tag:ciphertext (base64) */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey(requireKey());
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('base64')).join(':');
}

export function decryptSecret(payload: string): string {
  const key = deriveKey(requireKey());
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8'
  );
}
