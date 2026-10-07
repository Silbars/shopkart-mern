const crypto = require('crypto');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Replace the real Razorpay client: tests never call Razorpay's servers
jest.mock('../config/razorpay', () => ({
  isRazorpayConfigured: jest.fn(() => true),
  getRazorpay: jest.fn()
}));
const razorpayConfig = require('../config/razorpay');

const app = require('../index');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');

const TEST_KEY_ID = 'rzp_test_key_id_for_tests';
const TEST_KEY_SECRET = 'rzp_test_secret_for_tests';

let mongoServer;
let razorpayOrderCounter = 0;
const createRazorpayOrder = jest.fn(async ({ amount, currency, receipt }) => {
  razorpayOrderCounter += 1;
  return { id: `order_test_${razorpayOrderCounter}`, amount, currency, receipt, status: 'created' };
});

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_12345';
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
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
  await Order.deleteMany({});
  createRazorpayOrder.mockClear();
  razorpayOrderCounter = 0;
  razorpayConfig.isRazorpayConfigured.mockReturnValue(true);
  razorpayConfig.getRazorpay.mockReturnValue({ orders: { create: createRazorpayOrder } });
});

const customerA = { fullName: 'Aarav Sharma', email: 'aarav@example.com', password: 'aarav123', phone: '9876543210' };
const customerB = { fullName: 'Meera Iyer', email: 'meera@example.com', password: 'meera123', phone: '9123456780' };

const address = (overrides = {}) => ({
  fullName: 'Aarav Sharma',
  phone: '9876543210',
  addressLine1: '22 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  ...overrides
});

const productData = (overrides = {}) => ({
  name: 'Mechanical Keyboard',
  description: 'RGB mechanical keyboard.',
  price: 2999,
  category: 'Electronics',
  image: 'https://example.com/keyboard.jpg',
  stock: 10,
  ...overrides
});

const loginAgent = async (customer) => {
  const agent = request.agent(app);
  await agent.post('/customers/register').send(customer);
  const res = await agent.post('/customers/login').send({ email: customer.email, password: customer.password });
  expect(res.status).toBe(200);
  return agent;
};

/** Signs exactly like Razorpay does: HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
const sign = (razorpayOrderId, paymentId, secret = TEST_KEY_SECRET) =>
  crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${paymentId}`).digest('hex');

const startCheckout = (agent, body = { shippingAddress: address() }) =>
  agent.post('/orders/create-payment-order').send(body);

const payAndVerify = async (agent, checkout, paymentId = 'pay_test_001') =>
  agent.post('/orders/verify-payment').send({
    shopKartOrderId: checkout.shopKartOrderId,
    razorpay_order_id: checkout.razorpayOrderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: sign(checkout.razorpayOrderId, paymentId)
  });

describe('ShopKart Checkout & Orders (Lab 06)', () => {
  let agent;
  let keyboard;
  let mouse;

  beforeEach(async () => {
    agent = await loginAgent(customerA);
    keyboard = await Product.create(productData());
    mouse = await Product.create(productData({ name: 'Wireless Mouse', price: 1499, stock: 5, image: 'https://example.com/mouse.jpg' }));
    // Lab sheet example cart: Keyboard x2 + Mouse x1 = ₹7,497
    await agent.post(`/cart/${keyboard._id}`).send({ quantity: 2 });
    await agent.post(`/cart/${mouse._id}`);
  });

  describe('Task 3: shipping address validation (server side)', () => {
    it.each([
      ['fullName', ''],
      ['fullName', '   '],
      ['addressLine1', '  '],
      ['city', ''],
      ['state', ''],
      ['phone', '12345'],
      ['phone', '98765432100'],
      ['phone', 'abcdefghij'],
      ['pincode', '5600'],
      ['pincode', '56000a'],
      ['pincode', '060001']
    ])('should return 400 when %s is %p', async (field, value) => {
      const res = await startCheckout(agent, { shippingAddress: address({ [field]: value }) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[field]).toBeDefined();
      expect(createRazorpayOrder).not.toHaveBeenCalled();
      expect(await Order.countDocuments()).toBe(0);
    });

    it('should return 400 when the shipping address is missing', async () => {
      const res = await startCheckout(agent, {});
      expect(res.status).toBe(400);
    });

    it('should say "Pincode must contain 6 digits."', async () => {
      const res = await startCheckout(agent, { shippingAddress: address({ pincode: '123' }) });
      expect(res.body.errors.pincode).toBe('Pincode must contain 6 digits.');
    });

    it('should trim values before saving them', async () => {
      const res = await startCheckout(agent, { shippingAddress: address({ city: '  Bengaluru  ' }) });
      expect(res.status).toBe(201);
      const order = await Order.findById(res.body.shopKartOrderId);
      expect(order.shippingAddress.city).toBe('Bengaluru');
    });
  });

  describe('Task 4: POST /orders/create-payment-order', () => {
    it('should create a pending order and a Razorpay order for the server-calculated total', async () => {
      const res = await startCheckout(agent);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.shopKartOrderId).toBeDefined();
      expect(res.body.razorpayOrderId).toBe('order_test_1');
      expect(res.body.amount).toBe(749700); // ₹7,497 in paise
      expect(res.body.currency).toBe('INR');
      expect(res.body.key).toBe(TEST_KEY_ID);

      expect(createRazorpayOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 749700, currency: 'INR', receipt: res.body.shopKartOrderId })
      );

      const order = await Order.findById(res.body.shopKartOrderId);
      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.paymentStatus).toBe('PENDING');
      expect(order.totalAmount).toBe(7497);
      expect(order.razorpayOrderId).toBe('order_test_1');
    });

    it('should never send the Razorpay key secret to the client', async () => {
      const res = await startCheckout(agent);
      expect(JSON.stringify(res.body)).not.toContain(TEST_KEY_SECRET);
    });

    it('should snapshot name, price, quantity and image for every item', async () => {
      const res = await startCheckout(agent);
      const order = await Order.findById(res.body.shopKartOrderId).lean();

      const kb = order.items.find((i) => i.product.toString() === keyboard._id.toString());
      expect(kb).toMatchObject({ name: 'Mechanical Keyboard', price: 2999, quantity: 2, image: 'https://example.com/keyboard.jpg' });
      expect(order.items).toHaveLength(2);
    });

    it('should ignore a fake totalAmount and items sent by the client', async () => {
      const res = await startCheckout(agent, {
        shippingAddress: address(),
        totalAmount: 1,
        items: [{ product: keyboard._id, name: 'Keyboard', price: 1, quantity: 100 }]
      });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(749700);
      const order = await Order.findById(res.body.shopKartOrderId);
      expect(order.totalAmount).toBe(7497);
      expect(order.items.find((i) => i.name === 'Mechanical Keyboard').quantity).toBe(2);
    });

    it('should use the latest product price', async () => {
      await Product.updateOne({ _id: keyboard._id }, { price: 2499 });
      const res = await startCheckout(agent);
      expect(res.body.amount).toBe((2499 * 2 + 1499) * 100);
    });

    it('should keep the cart unchanged after the Razorpay order is created', async () => {
      await startCheckout(agent);
      const cart = await agent.get('/cart');
      expect(cart.body.cart).toHaveLength(2);
    });

    it('should also accept POST /orders (lab Postman test 1 path)', async () => {
      const res = await agent.post('/orders').send({ shippingAddress: address() });
      expect(res.status).toBe(201);
    });

    it('should return 400 for an empty cart', async () => {
      const agentB = await loginAgent(customerB);
      const res = await startCheckout(agentB);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/empty/i);
      expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('should return 400 with a useful message when stock is insufficient', async () => {
      await Product.updateOne({ _id: keyboard._id }, { stock: 1 });
      const res = await startCheckout(agent);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Insufficient stock for Mechanical Keyboard.');
      expect(await Order.countDocuments()).toBe(0);
      const cart = await agent.get('/cart');
      expect(cart.body.cart).toHaveLength(2);
    });

    it('should return 400 when a product in the cart was deleted', async () => {
      await Product.deleteOne({ _id: mouse._id });
      const res = await startCheckout(agent);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no longer available/i);
      expect(await Order.countDocuments()).toBe(0);
    });

    it('should reuse the pending order when checkout is retried with the same cart', async () => {
      const first = await startCheckout(agent);
      const second = await startCheckout(agent, { shippingAddress: address({ city: 'Mysuru' }) });

      expect(second.body.shopKartOrderId).toBe(first.body.shopKartOrderId);
      expect(second.body.razorpayOrderId).toBe(first.body.razorpayOrderId);
      expect(createRazorpayOrder).toHaveBeenCalledTimes(1);
      expect(await Order.countDocuments()).toBe(1);
      const order = await Order.findById(first.body.shopKartOrderId);
      expect(order.shippingAddress.city).toBe('Mysuru');
    });

    it('should create a new order when the cart changed since the last attempt', async () => {
      const first = await startCheckout(agent);
      await agent.post(`/cart/${mouse._id}`);
      const second = await startCheckout(agent);

      expect(second.body.shopKartOrderId).not.toBe(first.body.shopKartOrderId);
      expect(second.body.amount).toBe((2999 * 2 + 1499 * 2) * 100);
    });

    it('should return 503 and keep the cart when Razorpay keys are not configured', async () => {
      razorpayConfig.isRazorpayConfigured.mockReturnValue(false);
      const res = await startCheckout(agent);

      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/not configured/i);
      expect(await Order.countDocuments()).toBe(0);
    });

    it('should return 502, mark the order FAILED and keep the cart when Razorpay fails', async () => {
      createRazorpayOrder.mockRejectedValueOnce(new Error('Razorpay is down'));
      const res = await startCheckout(agent);

      expect(res.status).toBe(502);
      const order = await Order.findOne();
      expect(order.paymentStatus).toBe('FAILED');
      const cart = await agent.get('/cart');
      expect(cart.body.cart).toHaveLength(2);
    });
  });

  describe('POST /orders/verify-payment', () => {
    it('should mark the order PAID / PLACED, store the payment id and clear the cart', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await payAndVerify(agent, checkout);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.paymentStatus).toBe('PAID');
      expect(res.body.order.status).toBe('PLACED');
      expect(res.body.order.razorpayPaymentId).toBe('pay_test_001');

      const cart = await agent.get('/cart');
      expect(cart.body.cart).toEqual([]);
    });

    it('should reduce stock by the purchased quantities', async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);

      expect((await Product.findById(keyboard._id)).stock).toBe(8);
      expect((await Product.findById(mouse._id)).stock).toBe(4);
    });

    it('should reject a fake signature: order not PAID, cart kept, stock unchanged', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await agent.post('/orders/verify-payment').send({
        shopKartOrderId: checkout.shopKartOrderId,
        razorpay_order_id: checkout.razorpayOrderId,
        razorpay_payment_id: 'pay_test_001',
        razorpay_signature: 'fake_signature'
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid payment signature');
      const order = await Order.findById(checkout.shopKartOrderId);
      expect(order.paymentStatus).not.toBe('PAID');
      expect(order.status).toBe('PENDING_PAYMENT');
      expect((await agent.get('/cart')).body.cart).toHaveLength(2);
      expect((await Product.findById(keyboard._id)).stock).toBe(10);
    });

    it('should reject a signature made with a different secret', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await agent.post('/orders/verify-payment').send({
        shopKartOrderId: checkout.shopKartOrderId,
        razorpay_order_id: checkout.razorpayOrderId,
        razorpay_payment_id: 'pay_test_001',
        razorpay_signature: sign(checkout.razorpayOrderId, 'pay_test_001', 'some_other_secret')
      });
      expect(res.status).toBe(400);
    });

    it('should reject a Razorpay order id that does not match the stored one', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await agent.post('/orders/verify-payment').send({
        shopKartOrderId: checkout.shopKartOrderId,
        razorpay_order_id: 'order_someone_else',
        razorpay_payment_id: 'pay_test_001',
        // Correctly signed, but for a different Razorpay order
        razorpay_signature: sign('order_someone_else', 'pay_test_001')
      });

      expect(res.status).toBe(400);
      expect((await Order.findById(checkout.shopKartOrderId)).paymentStatus).not.toBe('PAID');
    });

    it('should ignore a client-side "paymentSuccess: true"', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await agent.post('/orders/verify-payment').send({
        shopKartOrderId: checkout.shopKartOrderId,
        paymentSuccess: true
      });

      expect(res.status).toBe(400);
      expect((await Order.findById(checkout.shopKartOrderId)).paymentStatus).toBe('PENDING');
    });

    it('should be safe to verify twice: same order, stock reduced only once', async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);
      const again = await payAndVerify(agent, checkout);

      expect(again.status).toBe(200);
      expect(again.body.order.status).toBe('PLACED');
      expect((await Product.findById(keyboard._id)).stock).toBe(8);
    });

    it("should return 404 when verifying someone else's order", async () => {
      const checkout = (await startCheckout(agent)).body;
      const agentB = await loginAgent(customerB);
      const res = await payAndVerify(agentB, checkout);

      expect(res.status).toBe(404);
      expect((await Order.findById(checkout.shopKartOrderId)).paymentStatus).toBe('PENDING');
    });

    it('should flag a stock issue instead of going negative if stock ran out during payment', async () => {
      const checkout = (await startCheckout(agent)).body;
      await Product.updateOne({ _id: mouse._id }, { stock: 0 }); // someone else bought the last one
      const res = await payAndVerify(agent, checkout);

      expect(res.status).toBe(200);
      expect(res.body.order.paymentStatus).toBe('PAID');
      expect(res.body.order.stockIssue).toBe(true);
      expect((await Product.findById(mouse._id)).stock).toBe(0);
    });
  });

  describe('Task 7: GET /orders and GET /orders/:id', () => {
    it('should list only placed orders of the current customer, newest first', async () => {
      const first = (await startCheckout(agent)).body;
      await payAndVerify(agent, first, 'pay_first');

      await agent.post(`/cart/${mouse._id}`);
      const second = (await startCheckout(agent)).body;
      await payAndVerify(agent, second, 'pay_second');

      await agent.post(`/cart/${keyboard._id}`);
      await startCheckout(agent); // abandoned: stays PENDING_PAYMENT

      const res = await agent.get('/orders');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orders).toHaveLength(2);
      expect(res.body.orders[0]._id).toBe(second.shopKartOrderId);
      expect(res.body.orders[1]._id).toBe(first.shopKartOrderId);

      const agentB = await loginAgent(customerB);
      expect((await agentB.get('/orders')).body.orders).toHaveLength(0);
    });

    it('should keep the purchase-time price after the product price changes', async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);
      await Product.updateOne({ _id: keyboard._id }, { price: 3499, name: 'Keyboard v2' });

      const res = await agent.get(`/orders/${checkout.shopKartOrderId}`);
      const kb = res.body.order.items.find((i) => i.product === keyboard._id.toString());
      expect(kb.price).toBe(2999);
      expect(kb.name).toBe('Mechanical Keyboard');
      expect(res.body.order.totalAmount).toBe(7497);
    });

    it("should return 404 for another customer's order", async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);
      const agentB = await loginAgent(customerB);

      const res = await agentB.get(`/orders/${checkout.shopKartOrderId}`);
      expect(res.status).toBe(404);
      expect(res.body.order).toBeUndefined();
    });

    it('should return 400 for an invalid order id and 404 for an unknown one', async () => {
      expect((await agent.get('/orders/not-an-id')).status).toBe(400);
      expect((await agent.get(`/orders/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    });
  });

  describe('Bonus: PATCH /orders/:id/status', () => {
    it('should move a placed order forward one step at a time', async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);

      const steps = [];
      for (let i = 0; i < 3; i += 1) {
        const res = await agent.patch(`/orders/${checkout.shopKartOrderId}/status`);
        steps.push(res.body.order.status);
      }
      expect(steps).toEqual(['CONFIRMED', 'SHIPPED', 'DELIVERED']);

      const done = await agent.patch(`/orders/${checkout.shopKartOrderId}/status`);
      expect(done.status).toBe(400);
    });

    it('should refuse to advance an unpaid order', async () => {
      const checkout = (await startCheckout(agent)).body;
      const res = await agent.patch(`/orders/${checkout.shopKartOrderId}/status`);
      expect(res.status).toBe(400);
    });

    it('should be disabled in production', async () => {
      const checkout = (await startCheckout(agent)).body;
      await payAndVerify(agent, checkout);
      process.env.NODE_ENV = 'production';
      try {
        const res = await agent.patch(`/orders/${checkout.shopKartOrderId}/status`);
        expect(res.status).toBe(403);
      } finally {
        process.env.NODE_ENV = 'test';
      }
    });
  });

  describe('Authentication: all order endpoints are protected', () => {
    it('should return 401 without a token', async () => {
      const id = new mongoose.Types.ObjectId();
      const calls = [
        request(app).post('/orders/create-payment-order').send({ shippingAddress: address() }),
        request(app).post('/orders').send({ shippingAddress: address() }),
        request(app).post('/orders/verify-payment').send({}),
        request(app).get('/orders'),
        request(app).get(`/orders/${id}`),
        request(app).patch(`/orders/${id}/status`)
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(401);
      }
    });
  });
});
