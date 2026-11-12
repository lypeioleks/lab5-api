import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';

describe('Orders API', () => {
  let app: Express;
  let aliceToken: string;
  let bobToken: string;

  beforeEach(async () => {
    app = createApp();
    aliceToken = await login(app);
    bobToken = await login(app, 'bob@example.com');
  });

  it('should create an order and return correct response', async () => {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(makeOrderPayload());

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe('/orders/1');
    expect(response.body.id).toBe('1');
    expect(response.body.subtotal).toBe(1000);
    expect(response.body.discount).toBe(100);
    expect(response.body.shipping).toBe(60);
    expect(response.body.total).toBe(960);
  });

  it.each([
    [[], 'EMPTY_ORDER'],
    [[{ name: 'Bad', price: -10, qty: 1 }], 'INVALID_PRICE'],
    [[{ name: 'Bad', price: 'abc', qty: 1 }], 'INVALID_PRICE'],
    [[{ name: 'Bad', price: 100, qty: 0 }], 'INVALID_QTY'],
    [[{ name: 'Bad', price: 100, qty: 1.5 }], 'INVALID_QTY']
  ])('should reject invalid order items', async (items, code) => {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ items });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(code);
  });

  it('should reject login with invalid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'alice@example.com',
        password: 'wrong'
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it.each([
    undefined,
    'Bearer fake-token',
    'token-without-bearer'
  ])('should reject unauthorized requests', async (authorization) => {
    const req = request(app).get('/orders');

    if (authorization !== undefined) {
      req.set('Authorization', authorization);
    }

    const response = await req;

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('should not allow one user to access another user order', async () => {
    const created = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(makeOrderPayload());

    const response = await request(app)
      .get(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('should return only orders belonging to the logged-in user', async () => {
    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(makeOrderPayload());

    await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${bobToken}`)
      .send(makeOrderPayload(100, 1));

    const response = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe('1');
  });

  it('should delete an order and return 404 when deleting again', async () => {
    const created = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send(makeOrderPayload());

    const firstDelete = await request(app)
      .delete(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(firstDelete.status).toBe(204);
    expect(firstDelete.text).toBe('');

    const secondDelete = await request(app)
      .delete(`/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(secondDelete.status).toBe(404);
  });
});