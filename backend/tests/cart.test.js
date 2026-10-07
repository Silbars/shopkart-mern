const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_12345';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Customer.deleteMany({});
  await Product.deleteMany({});
});

const customerA = {
  fullName: 'John Doe',
  email: 'john@gmail.com',
  password: 'john123',
  phone: '9876543210'
};

const customerB = {
  fullName: 'Jane Roe',
  email: 'jane@gmail.com',
  password: 'jane123',
  phone: '9123456780'
};

const productData = (overrides = {}) => ({
  name: 'Mechanical Keyboard',
  description: 'RGB mechanical keyboard with blue switches.',
  price: 2999,
  category: 'Electronics',
  image: 'https://example.com/keyboard.jpg',
  stock: 10,
  ...overrides
});

/** Registers + logs in a customer; the agent keeps the HttpOnly auth cookie. */
const loginAgent = async (customer) => {
  const agent = request.agent(app);
  await agent.post('/customers/register').send(customer);
  const res = await agent
    .post('/customers/login')
    .send({ email: customer.email, password: customer.password });
  expect(res.status).toBe(200);
  return agent;
};

const findItem = (cart, productId) =>
  cart.find((item) => item.product._id === productId.toString());

describe('ShopKart Shopping Cart (Lab 05)', () => {
  let agent;
  let keyboard;

  beforeEach(async () => {
    agent = await loginAgent(customerA);
    keyboard = await Product.create(productData());
  });

  describe('Task 1: Customer schema', () => {
    it('should default cart to an empty array', async () => {
      const customer = await Customer.findOne({ email: customerA.email });
      expect(Array.isArray(customer.cart)).toBe(true);
      expect(customer.cart).toHaveLength(0);
    });

    it('should keep working for customers saved before the cart field existed', async () => {
      await Customer.collection.updateOne({ email: customerA.email }, { $unset: { cart: '' } });

      const getRes = await agent.get('/cart');
      expect(getRes.status).toBe(200);
      expect(getRes.body.cart).toEqual([]);

      const addRes = await agent.post(`/cart/${keyboard._id}`);
      expect(addRes.status).toBe(201);
      expect(findItem(addRes.body.cart, keyboard._id).quantity).toBe(1);
    });

    it('should store a Product ObjectId and a quantity, not a product copy', async () => {
      await agent.post(`/cart/${keyboard._id}`);

      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.cart).toHaveLength(1);
      expect(raw.cart[0].product).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(raw.cart[0].product.toString()).toBe(keyboard._id.toString());
      expect(raw.cart[0].quantity).toBe(1);
      expect(raw.cart[0].price).toBeUndefined();
      expect(raw.cart[0].name).toBeUndefined();
    });

    it('should reject a quantity below 1 at the schema level', async () => {
      const customer = await Customer.findOne({ email: customerA.email });
      customer.cart.push({ product: keyboard._id, quantity: 0 });
      await expect(customer.save()).rejects.toThrow();
    });
  });

  describe('Task 2: POST /cart/:productId', () => {
    it('should add a new product with quantity 1 and return the populated cart', async () => {
      const res = await agent.post(`/cart/${keyboard._id}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cart updated');
      expect(res.body.cart).toHaveLength(1);
      const item = findItem(res.body.cart, keyboard._id);
      expect(item.quantity).toBe(1);
      expect(item.product.name).toBe('Mechanical Keyboard');
      expect(item.product.price).toBe(2999);
    });

    it('should increase quantity instead of adding a duplicate row', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      const res = await agent.post(`/cart/${keyboard._id}`);

      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(1);
      expect(findItem(res.body.cart, keyboard._id).quantity).toBe(2);

      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.cart).toHaveLength(1);
    });

    it('should return 400 when adding would exceed stock', async () => {
      const mouse = await Product.create(productData({ name: 'Mouse', stock: 2 }));
      await agent.post(`/cart/${mouse._id}`);
      await agent.post(`/cart/${mouse._id}`);
      const res = await agent.post(`/cart/${mouse._id}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/2/);

      const cartRes = await agent.get('/cart');
      expect(findItem(cartRes.body.cart, mouse._id).quantity).toBe(2);
    });

    it('should return 400 for an out-of-stock product', async () => {
      const jacket = await Product.create(productData({ name: 'Jacket', stock: 0 }));
      const res = await agent.post(`/cart/${jacket._id}`);

      expect(res.status).toBe(400);
      const cartRes = await agent.get('/cart');
      expect(cartRes.body.cart).toHaveLength(0);
    });

    it('should never exceed stock when the same product is added concurrently', async () => {
      const mouse = await Product.create(productData({ name: 'Mouse', stock: 2 }));
      const results = await Promise.all(
        Array.from({ length: 5 }, () => agent.post(`/cart/${mouse._id}`))
      );

      const ok = results.filter((r) => r.status === 200 || r.status === 201);
      const rejected = results.filter((r) => r.status === 400);
      expect(ok).toHaveLength(2);
      expect(rejected).toHaveLength(3);

      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.cart).toHaveLength(1);
      expect(raw.cart[0].quantity).toBe(2);
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.post('/cart/not-a-valid-id');
      expect(res.status).toBe(400);
    });

    it('should return 404 when the product does not exist', async () => {
      const res = await agent.post(`/cart/${new mongoose.Types.ObjectId()}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should ignore a userId sent in the request body', async () => {
      await loginAgent(customerB);
      const jane = await Customer.findOne({ email: customerB.email });

      await agent.post(`/cart/${keyboard._id}`).send({ userId: jane._id.toString() });

      const john = await Customer.findOne({ email: customerA.email });
      const janeAfter = await Customer.findById(jane._id);
      expect(john.cart).toHaveLength(1);
      expect(janeAfter.cart).toHaveLength(0);
    });
  });

  describe('POST /cart/:productId with an optional quantity (Product Details "Qty" selector)', () => {
    it('should add a new product with the requested quantity', async () => {
      const res = await agent.post(`/cart/${keyboard._id}`).send({ quantity: 3 });

      expect(res.status).toBe(201);
      expect(findItem(res.body.cart, keyboard._id).quantity).toBe(3);
    });

    it('should add the requested quantity to an existing row', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      const res = await agent.post(`/cart/${keyboard._id}`).send({ quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.cart).toHaveLength(1);
      expect(findItem(res.body.cart, keyboard._id).quantity).toBe(3);
    });

    it('should return 400 and change nothing when the total would exceed stock', async () => {
      await agent.post(`/cart/${keyboard._id}`).send({ quantity: 9 });
      const res = await agent.post(`/cart/${keyboard._id}`).send({ quantity: 2 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/10/);
      expect(res.body.message).toMatch(/9/);

      const cartRes = await agent.get('/cart');
      expect(findItem(cartRes.body.cart, keyboard._id).quantity).toBe(9);
    });

    it('should return 400 when a new product is requested above its stock', async () => {
      const res = await agent.post(`/cart/${keyboard._id}`).send({ quantity: 11 });
      expect(res.status).toBe(400);

      const cartRes = await agent.get('/cart');
      expect(cartRes.body.cart).toHaveLength(0);
    });

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['a decimal', 1.5],
      ['a numeric string', '2']
    ])('should return 400 when quantity is %s', async (_label, quantity) => {
      const res = await agent.post(`/cart/${keyboard._id}`).send({ quantity });
      expect(res.status).toBe(400);
    });

    it('should never exceed stock when quantities are added concurrently', async () => {
      const mouse = await Product.create(productData({ name: 'Mouse', stock: 5 }));
      const results = await Promise.all(
        Array.from({ length: 4 }, () => agent.post(`/cart/${mouse._id}`).send({ quantity: 2 }))
      );

      const ok = results.filter((r) => r.status === 200 || r.status === 201);
      expect(ok).toHaveLength(2);

      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.cart).toHaveLength(1);
      expect(raw.cart[0].quantity).toBe(4);
    });
  });

  describe('Task 3: GET /cart', () => {
    it('should return an empty cart', async () => {
      const res = await agent.get('/cart');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cart).toEqual([]);
    });

    it('should return populated product data with quantity', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      await agent.post(`/cart/${keyboard._id}`);

      const res = await agent.get('/cart');
      const item = findItem(res.body.cart, keyboard._id);
      expect(item.quantity).toBe(2);
      expect(item.product).toMatchObject({
        name: 'Mechanical Keyboard',
        price: 2999,
        category: 'Electronics',
        image: 'https://example.com/keyboard.jpg',
        stock: 10
      });
    });

    it('should show the latest product price (Product is the source of truth)', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      await Product.updateOne({ _id: keyboard._id }, { price: 2499 });

      const res = await agent.get('/cart');
      expect(findItem(res.body.cart, keyboard._id).product.price).toBe(2499);
    });

    it('should skip products that were deleted from the catalog', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      await Product.deleteOne({ _id: keyboard._id });

      const res = await agent.get('/cart');
      expect(res.status).toBe(200);
      expect(res.body.cart).toEqual([]);
    });

    it("should only return the authenticated customer's cart", async () => {
      const agentB = await loginAgent(customerB);
      await agent.post(`/cart/${keyboard._id}`);

      const resB = await agentB.get('/cart');
      expect(resB.body.cart).toHaveLength(0);
    });

    it('should persist the cart across logout and login', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      await agent.post('/customers/logout');

      const freshAgent = request.agent(app);
      await freshAgent
        .post('/customers/login')
        .send({ email: customerA.email, password: customerA.password });

      const res = await freshAgent.get('/cart');
      expect(findItem(res.body.cart, keyboard._id).quantity).toBe(1);
    });
  });

  describe('Task 4: PATCH /cart/:productId', () => {
    beforeEach(async () => {
      await agent.post(`/cart/${keyboard._id}`);
    });

    it('should update the quantity and return the populated cart', async () => {
      const res = await agent.patch(`/cart/${keyboard._id}`).send({ quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(findItem(res.body.cart, keyboard._id).quantity).toBe(3);
    });

    it.each([
      ['zero', 0],
      ['negative', -2],
      ['a decimal', 1.5],
      ['a string', 'abc'],
      ['a numeric string', '3'],
      ['missing', undefined]
    ])('should return 400 when quantity is %s', async (_label, quantity) => {
      const res = await agent.patch(`/cart/${keyboard._id}`).send({ quantity });
      expect(res.status).toBe(400);

      const cartRes = await agent.get('/cart');
      expect(findItem(cartRes.body.cart, keyboard._id).quantity).toBe(1);
    });

    it('should return 400 when quantity exceeds stock', async () => {
      const res = await agent.patch(`/cart/${keyboard._id}`).send({ quantity: 11 });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/10/);
    });

    it('should respect the latest stock after it changes', async () => {
      await Product.updateOne({ _id: keyboard._id }, { stock: 2 });

      const tooMany = await agent.patch(`/cart/${keyboard._id}`).send({ quantity: 3 });
      expect(tooMany.status).toBe(400);

      const ok = await agent.patch(`/cart/${keyboard._id}`).send({ quantity: 2 });
      expect(ok.status).toBe(200);
    });

    it('should return 404 when the product is not in the cart', async () => {
      const mouse = await Product.create(productData({ name: 'Mouse' }));
      const res = await agent.patch(`/cart/${mouse._id}`).send({ quantity: 2 });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not in cart');
    });

    it('should return 404 when the product does not exist', async () => {
      const res = await agent
        .patch(`/cart/${new mongoose.Types.ObjectId()}`)
        .send({ quantity: 2 });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.patch('/cart/not-a-valid-id').send({ quantity: 2 });
      expect(res.status).toBe(400);
    });
  });

  describe('Task 5: DELETE /cart/:productId', () => {
    it('should remove the product and return the updated cart', async () => {
      const mouse = await Product.create(productData({ name: 'Mouse' }));
      await agent.post(`/cart/${keyboard._id}`);
      await agent.post(`/cart/${mouse._id}`);

      const res = await agent.delete(`/cart/${keyboard._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cart).toHaveLength(1);
      expect(findItem(res.body.cart, mouse._id)).toBeDefined();
      expect(findItem(res.body.cart, keyboard._id)).toBeUndefined();
    });

    it('should return 404 when the product is not in the cart', async () => {
      const res = await agent.delete(`/cart/${keyboard._id}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not in cart');
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.delete('/cart/not-a-valid-id');
      expect(res.status).toBe(400);
    });

    it('should allow removing a product that was deleted from the catalog', async () => {
      await agent.post(`/cart/${keyboard._id}`);
      await Product.deleteOne({ _id: keyboard._id });

      const res = await agent.delete(`/cart/${keyboard._id}`);
      expect(res.status).toBe(200);
      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.cart).toHaveLength(0);
    });
  });

  describe('Authentication: all cart endpoints are protected', () => {
    const endpoints = () => [
      ['get', '/cart'],
      ['post', `/cart/${keyboard._id}`],
      ['patch', `/cart/${keyboard._id}`],
      ['delete', `/cart/${keyboard._id}`]
    ];

    it('should return 401 without a token', async () => {
      for (const [method, url] of endpoints()) {
        const res = await request(app)[method](url).send({ quantity: 2 });
        expect(res.status).toBe(401);
      }
    });

    it('should return 401 with an invalid token', async () => {
      for (const [method, url] of endpoints()) {
        const res = await request(app)[method](url)
          .set('Authorization', 'Bearer invalid.token.here')
          .send({ quantity: 2 });
        expect(res.status).toBe(401);
      }
    });
  });
});
