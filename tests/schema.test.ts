import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload } from './helpers';
import { orderSchema } from './schemas/order.schema';
import { expectSchema } from './schema-helper';

describe('Order JSON Schema', () => {
  it('should validate the created order response', async () => {
    const app = createApp();
    const token = await login(app);

    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(makeOrderPayload());

    expect(response.status).toBe(201);
    expectSchema(response.body, orderSchema);
  });
});