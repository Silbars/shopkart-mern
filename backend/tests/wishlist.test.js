const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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

/**
 * Registers + logs in a customer and returns a supertest agent
 * that carries the HttpOnly auth cookie on every request.
 */
const loginAgent = async (customer) => {
  const agent = request.agent(app);
  await agent.post('/customers/register').send(customer);
  const res = await agent
    .post('/customers/login')
    .send({ email: customer.email, password: customer.password });
  expect(res.status).toBe(200);
  return agent;
};

describe('ShopKart Wishlist (Lab 04)', () => {
  let agent;
  let keyboard;

  beforeEach(async () => {
    agent = await loginAgent(customerA);
    keyboard = await Product.create(productData());
  });

  describe('Task 1: Customer schema', () => {
    it('should default wishlist to an empty array for new customers', async () => {
      const customer = await Customer.findOne({ email: customerA.email });
      expect(Array.isArray(customer.wishlist)).toBe(true);
      expect(customer.wishlist).toHaveLength(0);
    });

    it('should keep working for existing customers saved without a wishlist field', async () => {
      // Simulate a Lab 01 document created before the wishlist field existed
      await Customer.collection.updateOne(
        { email: customerA.email },
        { $unset: { wishlist: '' } }
      );

      const res = await agent.get('/wishlist');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.wishlist).toEqual([]);

      const addRes = await agent.post(`/wishlist/${keyboard._id}`);
      expect(addRes.status).toBe(201);
    });

    it('should store Product ObjectId references, not product copies', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);

      const raw = await Customer.collection.findOne({ email: customerA.email });
      expect(raw.wishlist).toHaveLength(1);
      expect(raw.wishlist[0]).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(raw.wishlist[0].toString()).toBe(keyboard._id.toString());
    });
  });

  describe('Task 2: POST /wishlist/:productId', () => {
    it('should add a product and return 201 with the new count', async () => {
      const res = await agent.post(`/wishlist/${keyboard._id}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product added to wishlist');
      expect(res.body.count).toBe(1);
    });

    it('should return 409 when the product is already in the wishlist', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      const res = await agent.post(`/wishlist/${keyboard._id}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);

      const customer = await Customer.findOne({ email: customerA.email });
      expect(customer.wishlist).toHaveLength(1);
    });

    it('should not create duplicates when the same product is added concurrently', async () => {
      const results = await Promise.all([
        agent.post(`/wishlist/${keyboard._id}`),
        agent.post(`/wishlist/${keyboard._id}`),
        agent.post(`/wishlist/${keyboard._id}`)
      ]);

      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409, 409]);

      const customer = await Customer.findOne({ email: customerA.email });
      expect(customer.wishlist).toHaveLength(1);
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.post('/wishlist/not-a-valid-id');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when the product does not exist', async () => {
      const missingId = new mongoose.Types.ObjectId();
      const res = await agent.post(`/wishlist/${missingId}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not found');
    });

    it('should ignore a userId sent in the request body', async () => {
      await loginAgent(customerB);
      const jane = await Customer.findOne({ email: customerB.email });

      const res = await agent
        .post(`/wishlist/${keyboard._id}`)
        .send({ userId: jane._id.toString() });
      expect(res.status).toBe(201);

      const john = await Customer.findOne({ email: customerA.email });
      const janeAfter = await Customer.findById(jane._id);
      expect(john.wishlist).toHaveLength(1);
      expect(janeAfter.wishlist).toHaveLength(0);
    });
  });

  describe('Task 3: GET /wishlist', () => {
    it('should return an empty wishlist with count 0', async () => {
      const res = await agent.get('/wishlist');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.wishlist).toEqual([]);
    });

    it('should return populated product data for saved products', async () => {
      const headphones = await Product.create(
        productData({ name: 'Wireless Headphones', price: 4999, stock: 5 })
      );
      await agent.post(`/wishlist/${keyboard._id}`);
      await agent.post(`/wishlist/${headphones._id}`);

      const res = await agent.get('/wishlist');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      const names = res.body.wishlist.map((p) => p.name).sort();
      expect(names).toEqual(['Mechanical Keyboard', 'Wireless Headphones']);

      const item = res.body.wishlist.find((p) => p.name === 'Mechanical Keyboard');
      expect(item._id).toBe(keyboard._id.toString());
      expect(item.price).toBe(2999);
      expect(item.category).toBe('Electronics');
      expect(item.image).toBe('https://example.com/keyboard.jpg');
      expect(item.stock).toBe(10);
    });

    it('should reflect the latest product data (Product is the source of truth)', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      await Product.updateOne({ _id: keyboard._id }, { price: 1999, stock: 0 });

      const res = await agent.get('/wishlist');
      expect(res.body.wishlist[0].price).toBe(1999);
      expect(res.body.wishlist[0].stock).toBe(0);
    });

    it('should skip products that were deleted from the catalog', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      await Product.deleteOne({ _id: keyboard._id });

      const res = await agent.get('/wishlist');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.wishlist).toEqual([]);
    });

    it("should only return the authenticated customer's wishlist", async () => {
      const agentB = await loginAgent(customerB);
      await agent.post(`/wishlist/${keyboard._id}`);

      const resB = await agentB.get('/wishlist');
      expect(resB.status).toBe(200);
      expect(resB.body.count).toBe(0);

      const resA = await agent.get('/wishlist');
      expect(resA.body.count).toBe(1);
    });

    it('should persist the wishlist across a fresh login', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      await agent.post('/customers/logout');

      const freshAgent = request.agent(app);
      await freshAgent
        .post('/customers/login')
        .send({ email: customerA.email, password: customerA.password });

      const res = await freshAgent.get('/wishlist');
      expect(res.body.count).toBe(1);
    });

    it('should accept an Authorization: Bearer token (Postman flow)', async () => {
      const john = await Customer.findOne({ email: customerA.email });
      const token = jwt.sign({ id: john._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should not expose a GET /wishlist/:userId route', async () => {
      const agentB = await loginAgent(customerB);
      await agent.post(`/wishlist/${keyboard._id}`);
      const john = await Customer.findOne({ email: customerA.email });

      const res = await agentB.get(`/wishlist/${john._id}`);
      expect(res.status).toBe(404);
      expect(res.body.wishlist).toBeUndefined();
    });
  });

  describe('Task 4: DELETE /wishlist/:productId', () => {
    it('should remove a saved product and return the new count', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      const res = await agent.delete(`/wishlist/${keyboard._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product removed from wishlist');
      expect(res.body.count).toBe(0);
    });

    it('should return 404 when the product is not in the wishlist', async () => {
      const res = await agent.delete(`/wishlist/${keyboard._id}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Product not in wishlist');
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.delete('/wishlist/not-a-valid-id');
      expect(res.status).toBe(400);
    });

    it('should allow removing a product that was deleted from the catalog', async () => {
      await agent.post(`/wishlist/${keyboard._id}`);
      await Product.deleteOne({ _id: keyboard._id });

      const res = await agent.delete(`/wishlist/${keyboard._id}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });
  });

  describe('Bonus: PATCH /wishlist/:productId/toggle', () => {
    it('should add an unsaved product and return saved = true', async () => {
      const res = await agent.patch(`/wishlist/${keyboard._id}/toggle`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.saved).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('should remove a saved product and return saved = false', async () => {
      await agent.patch(`/wishlist/${keyboard._id}/toggle`);
      const res = await agent.patch(`/wishlist/${keyboard._id}/toggle`);

      expect(res.status).toBe(200);
      expect(res.body.saved).toBe(false);
      expect(res.body.count).toBe(0);
    });

    it('should return 404 when toggling a product that does not exist', async () => {
      const res = await agent.patch(`/wishlist/${new mongoose.Types.ObjectId()}/toggle`);
      expect(res.status).toBe(404);
    });

    it('should return 400 for an invalid product ID', async () => {
      const res = await agent.patch('/wishlist/not-a-valid-id/toggle');
      expect(res.status).toBe(400);
    });
  });

  describe('Authentication: all wishlist endpoints are protected', () => {
    const endpoints = () => [
      ['get', '/wishlist'],
      ['post', `/wishlist/${keyboard._id}`],
      ['delete', `/wishlist/${keyboard._id}`],
      ['patch', `/wishlist/${keyboard._id}/toggle`]
    ];

    it('should return 401 without a token', async () => {
      for (const [method, url] of endpoints()) {
        const res = await request(app)[method](url);
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    it('should return 401 with an invalid token', async () => {
      for (const [method, url] of endpoints()) {
        const res = await request(app)[method](url).set('Authorization', 'Bearer invalid.token.here');
        expect(res.status).toBe(401);
      }
    });
  });
});
