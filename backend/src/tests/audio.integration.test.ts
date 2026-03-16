import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { generateToken } from '../utils/jwt';

let token = '';

beforeAll(async () => {
  token = generateToken({ userId: 1, email: 'user@zello.tec.br' });
});

describe('POST /api/audio/transcribe', () => {
  it('retorna transcrição simulada com provider mock', async () => {
    const res = await request(app)
      .post('/api/audio/transcribe')
      .set('Cookie', [`token=${token}`]) // middleware de auth usa cookie
      .attach('audio', Buffer.from([0x00, 0x01, 0x02]), { filename: 'audio.wav', contentType: 'audio/wav' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text.length).toBeGreaterThan(10);
    expect(Array.isArray(res.body.data.keywords)).toBe(true);
    expect(Array.isArray(res.body.data.words)).toBe(true);
  });
});
