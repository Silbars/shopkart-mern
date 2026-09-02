const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const Customer = require('../models/customer.model');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_key_12345';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Customer.deleteMany({});
});

describe('ShopKart Customer Authentication Service (Lab 01)', () => {
  const sampleCustomer = {
    fullName: 'John Doe',
    email: 'john@gmail.com',
    password: 'john123',
    phone: '9876543210'
  };

  describe('Task 1: POST /customers/register', () => {
    it('should successfully register a customer with status 201 and return customer data without password', async () => {
      const res = await request(app)
        .post('/customers/register')
        .send(sampleCustomer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Customer registered successfully');
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.fullName).toBe('John Doe');
      expect(res.body.customer.email).toBe('john@gmail.com');
      expect(res.body.customer.phone).toBe('9876543210');
      expect(res.body.customer._id).toBeDefined();
      expect(res.body.customer.password).toBeUndefined();

      // Verify stored in DB as bcrypt hash
      const dbCustomer = await Customer.findOne({ email: 'john@gmail.com' });
      expect(dbCustomer).not.toBeNull();
      expect(dbCustomer.password).not.toBe(sampleCustomer.password);
      expect(dbCustomer.password.startsWith('$2')).toBe(true);
    });

    it('should return 400 when mandatory fields are missing', async () => {
      const res = await request(app)
        .post('/customers/register')
        .send({
          fullName: 'John Doe',
          email: 'john@gmail.com'
          // missing password and phone
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when password is less than 6 characters', async () => {
      const res = await request(app)
        .post('/customers/register')
        .send({
          fullName: 'John Doe',
          email: 'john@gmail.com',
          password: '123',
          phone: '9876543210'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/6 characters/i);
    });

    it('should return 409 when email already exists', async () => {
      await request(app).post('/customers/register').send(sampleCustomer);

      const duplicateRes = await request(app)
        .post('/customers/register')
        .send(sampleCustomer);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/Email already exists/i);
    });
  });

  describe('Task 2: POST /customers/login', () => {
    beforeEach(async () => {
      await request(app).post('/customers/register').send(sampleCustomer);
    });

    it('should successfully log in, return 200, customer info without password, and set HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: sampleCustomer.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.customer).toBeDefined();
      expect(res.body.customer.password).toBeUndefined();

      // Check HttpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toMatch(/HttpOnly/i);
    });

    it('should return 401 for non-existent email without revealing which field was wrong', async () => {
      const res = await request(app)
        .post('/customers/login')
        .send({
          email: 'wrongemail@gmail.com',
          password: sampleCustomer.password
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for incorrect password without revealing which field was wrong', async () => {
      const res = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: 'incorrectPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should return 400 if email or password is missing', async () => {
      const res = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Task 3: GET /customers/me (Protected Route)', () => {
    let authCookie;

    beforeEach(async () => {
      await request(app).post('/customers/register').send(sampleCustomer);
      const loginRes = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: sampleCustomer.password
        });
      authCookie = loginRes.headers['set-cookie'];
    });

    it('should return 401 Unauthorized if no cookie/token is provided', async () => {
      const res = await request(app).get('/customers/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 Unauthorized if token is invalid', async () => {
      const res = await request(app)
        .get('/customers/me')
        .set('Cookie', ['token=invalidjwttokenhere']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return customer profile (excluding password) when valid cookie is provided', async () => {
      const res = await request(app)
        .get('/customers/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('John Doe');
      expect(res.body.email).toBe('john@gmail.com');
      expect(res.body.phone).toBe('9876543210');
      expect(res.body._id).toBeDefined();
      expect(res.body.password).toBeUndefined();
    });
  });

  describe('Task 4: POST /customers/logout', () => {
    let authCookie;

    beforeEach(async () => {
      await request(app).post('/customers/register').send(sampleCustomer);
      const loginRes = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: sampleCustomer.password
        });
      authCookie = loginRes.headers['set-cookie'];
    });

    it('should clear the authentication cookie and return success', async () => {
      const res = await request(app)
        .post('/customers/logout')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      // Cleared cookie has expired date / empty value
      expect(tokenCookie).toMatch(/token=;/);
    });
  });

  describe('Bonus Challenge: PATCH /customers/change-password', () => {
    let authCookie;

    beforeEach(async () => {
      await request(app).post('/customers/register').send(sampleCustomer);
      const loginRes = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: sampleCustomer.password
        });
      authCookie = loginRes.headers['set-cookie'];
    });

    it('should return 401 if user is not logged in', async () => {
      const res = await request(app)
        .patch('/customers/change-password')
        .send({
          oldPassword: sampleCustomer.password,
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 if old password is incorrect', async () => {
      const res = await request(app)
        .patch('/customers/change-password')
        .set('Cookie', authCookie)
        .send({
          oldPassword: 'wrongoldpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid old password/i);
    });

    it('should return 400 if new password is too short', async () => {
      const res = await request(app)
        .patch('/customers/change-password')
        .set('Cookie', authCookie)
        .send({
          oldPassword: sampleCustomer.password,
          newPassword: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/6 characters/i);
    });

    it('should successfully change password, allow login with new password, and reject old password', async () => {
      const res = await request(app)
        .patch('/customers/change-password')
        .set('Cookie', authCookie)
        .send({
          oldPassword: sampleCustomer.password,
          newPassword: 'newSecretPassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password changed successfully');

      // Login with old password must fail
      const oldLoginRes = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: sampleCustomer.password
        });
      expect(oldLoginRes.status).toBe(401);

      // Login with new password must succeed
      const newLoginRes = await request(app)
        .post('/customers/login')
        .send({
          email: sampleCustomer.email,
          password: 'newSecretPassword123'
        });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.success).toBe(true);
    });
  });
});
