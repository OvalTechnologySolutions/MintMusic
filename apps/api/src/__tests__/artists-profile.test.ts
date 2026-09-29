import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { config } from '../config.js';

const WALLET = '0x1234567890123456789012345678901234567890';

function authHeaders() {
  return {
    'X-Internal-Secret': config.internalApiSecret,
    'X-User-Id': 'usr_test_artist_profile',
  };
}

describe('PUT /v1/artists/:wallet/profile', () => {
  const app = createApp();

  it('rejects unauthenticated writes', async () => {
    const res = await request(app)
      .put(`/v1/artists/${WALLET}/profile`)
      .send({ displayName: 'Hacked', bio: 'not yours' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejects a forged internal secret', async () => {
    const res = await request(app)
      .put(`/v1/artists/${WALLET}/profile`)
      .set({
        'X-Internal-Secret': 'wrong-internal-secret',
        'X-User-Id': 'usr_attacker',
      })
      .send({ displayName: 'Hacked' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('does not persist a profile without a wallet signature', async () => {
    const put = await request(app)
      .put(`/v1/artists/${WALLET}/profile`)
      .set(authHeaders())
      .send({ displayName: 'Should Not Stick', bio: 'siwe missing' });

    expect(put.status).toBe(401);
    expect(put.body.error).toBe('Wallet signature required');

    const read = await request(app).get(`/v1/artists/${WALLET}/profile`);
    expect(read.status).toBe(200);
    expect(read.body.profile).toBeNull();
  });
});
