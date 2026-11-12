import request from 'supertest';
import { Express } from 'express';

export async function login(app: Express, email = 'alice@example.com') {
  const response = await request(app)
    .post('/auth/login')
    .send({
      email,
      password: 'Secret123'
    });

  return response.body.accessToken as string;
}

export function makeOrderPayload(
  price = 500,
  qty = 2
) {
  return {
    items: [
      {
        name: 'Test product',
        price,
        qty
      }
    ]
  };
}
