export const orderSchema = {
  type: 'object',
  required: [
    'id',
    'items',
    'subtotal',
    'discount',
    'shipping',
    'total'
  ],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string'
    },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['name', 'price', 'qty'],
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          qty: { type: 'integer', minimum: 1 }
        }
      }
    },
    subtotal: { type: 'number', minimum: 0 },
    discount: { type: 'number', minimum: 0 },
    shipping: { type: 'number', minimum: 0 },
    total: { type: 'number', minimum: 0 }
  }
};