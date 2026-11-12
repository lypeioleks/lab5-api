import express, { Request, Response } from 'express';

type User = {
  id: string;
  email: string;
  password: string;
  tier: 'basic' | 'silver' | 'gold';
};

type OrderItem = {
  name: string;
  price: number;
  qty: number;
};

type Order = {
  id: string;
  ownerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

const users: User[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    password: 'Secret123',
    tier: 'gold'
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    password: 'Secret123',
    tier: 'basic'
  }
];

export function createApp() {
  const app = express();

  app.use(express.json());

  const tokens = new Map<string, string>();
  const orders = new Map<string, Order>();

  let nextOrderId = 1;

  app.post('/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS'
      });
    }

    const accessToken = `token-${user.id}`;
    tokens.set(accessToken, user.id);

    return res.status(200).json({
      accessToken
    });
  });

  app.use('/orders', (req: Request, res: Response, next) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 'UNAUTHORIZED'
      });
    }

    const token = authorization.slice(7);
    const userId = tokens.get(token);

    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED'
      });
    }

    res.locals.userId = userId;
    next();
  });

  function toPublic(order: Order) {
    const { ownerId, ...publicOrder } = order;
    return publicOrder;
  }

  app.post('/orders', (req: Request, res: Response) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        code: 'EMPTY_ORDER'
      });
    }

    for (const item of items) {
      if (
        typeof item.price !== 'number' ||
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        return res.status(400).json({
          code: 'INVALID_PRICE'
        });
      }

      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return res.status(400).json({
          code: 'INVALID_QTY'
        });
      }
    }

    const userId = res.locals.userId as string;
    const user = users.find((u) => u.id === userId)!;

    const subtotal = items.reduce(
      (sum: number, item: OrderItem) => sum + item.price * item.qty,
      0
    );

    let discountRate =
      user.tier === 'gold' ? 0.1 :
      user.tier === 'silver' ? 0.05 : 0;

    if (subtotal >= 2000) {
      discountRate += 0.05;
    }

    discountRate = Math.min(discountRate, 0.25);

    const discount = Math.round(subtotal * discountRate * 100) / 100;
    const afterDiscount = subtotal - discount;
    const shipping = afterDiscount < 1000 ? 60 : 0;
    const total = afterDiscount + shipping;

    const order: Order = {
      id: String(nextOrderId++),
      ownerId: userId,
      items,
      subtotal,
      discount,
      shipping,
      total
    };

    orders.set(order.id, order);

   return res
  .status(201)
  .location(`/orders/${order.id}`)
  .json(toPublic(order));
  });

  app.get('/orders', (req: Request, res: Response) => {
    const userId = res.locals.userId as string;

    const rawMin = req.query.minTotal;
    const rawMax = req.query.maxTotal;

    const minTotal = rawMin === undefined ? undefined : Number(rawMin);
    const maxTotal = rawMax === undefined ? undefined : Number(rawMax);

    if (
      (minTotal !== undefined &&
        (!Number.isFinite(minTotal) || minTotal < 0)) ||
      (maxTotal !== undefined &&
        (!Number.isFinite(maxTotal) || maxTotal < 0)) ||
      (minTotal !== undefined &&
        maxTotal !== undefined &&
        minTotal > maxTotal)
    ) {
      return res.status(400).json({
        code: 'INVALID_FILTER'
      });
    }

    let result = Array.from(orders.values()).filter(
      (order) => order.ownerId === userId
    );

    if (minTotal !== undefined) {
      result = result.filter((order) => order.total >= minTotal);
    }

    if (maxTotal !== undefined) {
      result = result.filter((order) => order.total <= maxTotal);
    }

    return res.status(200).json(result.map(toPublic));
  });

  app.get('/orders/:id', (req: Request, res: Response) => {
    const userId = res.locals.userId as string;
   const order = orders.get(String(req.params.id));

    if (!order || order.ownerId !== userId) {
      return res.status(404).json({
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json(toPublic(order));
  });

  app.delete('/orders/:id', (req: Request, res: Response) => {
    const userId = res.locals.userId as string;
    const order = orders.get(String(req.params.id));

    if (!order || order.ownerId !== userId) {
      return res.status(404).json({
        code: 'NOT_FOUND'
      });
    }

    orders.delete(String(req.params.id));

    return res.status(204).send();
  });

  return app;
}