import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';

describe('GET /orders filters', () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = createApp();
    token = await login(app);

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload(500, 2));

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload(1000, 2));
  });

  it('should filter orders by minTotal', async () => {
    const response = await request(app)
      .get('/orders?minTotal=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].total).toBe(1700);
  });

  it('should filter orders by maxTotal', async () => {
    const response = await request(app)
      .get('/orders?maxTotal=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].total).toBe(960);
  });

  it('should include orders on filter boundaries', async () => {
    const response = await request(app)
      .get('/orders?minTotal=960&maxTotal=960')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].total).toBe(960);
  });

  it('should reject invalid filters', async () => {
    const response = await request(app)
      .get('/orders?minTotal=2000&maxTotal=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_FILTER');
  });
});