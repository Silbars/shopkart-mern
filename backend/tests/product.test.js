const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const Product = require('../models/product.model');

let mongoServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('ShopKart Product Catalog & Discovery (Lab 03)', () => {
  const sampleProduct = {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with blue switches.',
    price: 2999,
    category: 'Electronics',
    image: 'https://example.com/keyboard.jpg',
    stock: 10
  };

  describe('Task 1 & Task 2: POST /products (Create Product)', () => {
    it('should create a product with status 201 and return the product', async () => {
      const res = await request(app)
        .post('/products')
        .send(sampleProduct);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.product).toBeDefined();
      expect(res.body.product.name).toBe('Mechanical Keyboard');
      expect(res.body.product.price).toBe(2999);
      expect(res.body.product.category).toBe('Electronics');
      expect(res.body.product.stock).toBe(10);
      expect(res.body.product.createdAt).toBeDefined();

      const dbProduct = await Product.findById(res.body.product._id);
      expect(dbProduct).not.toBeNull();
      expect(dbProduct.name).toBe('Mechanical Keyboard');
    });

    it('should return 400 when a required field is missing', async () => {
      const missingFieldProduct = { ...sampleProduct };
      delete missingFieldProduct.category;

      const res = await request(app)
        .post('/products')
        .send(missingFieldProduct);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when price is zero or negative', async () => {
      const invalidPriceProduct = { ...sampleProduct, price: 0 };
      const res = await request(app)
        .post('/products')
        .send(invalidPriceProduct);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const negativePriceProduct = { ...sampleProduct, price: -100 };
      const resNegative = await request(app)
        .post('/products')
        .send(negativePriceProduct);

      expect(resNegative.status).toBe(400);
      expect(resNegative.body.success).toBe(false);
    });

    it('should return 400 when stock is negative or non-integer', async () => {
      const invalidStockProduct = { ...sampleProduct, stock: -5 };
      const res = await request(app)
        .post('/products')
        .send(invalidStockProduct);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const floatStockProduct = { ...sampleProduct, stock: 2.5 };
      const resFloat = await request(app)
        .post('/products')
        .send(floatStockProduct);

      expect(resFloat.status).toBe(400);
      expect(resFloat.body.success).toBe(false);
    });
  });

  describe('Task 3: GET /products (Get All Products)', () => {
    beforeEach(async () => {
      await Product.create([
        sampleProduct,
        {
          name: 'Noise Cancelling Headphones',
          description: 'Wireless over-ear headphones with ANC.',
          price: 4999,
          category: 'Electronics',
          image: 'https://example.com/headphones.jpg',
          stock: 25
        }
      ]);
    });

    it('should return all products with count and 200 status', async () => {
      const res = await request(app).get('/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBe(2);
    });
  });

  describe('Task 4: GET /products/:id (Get Single Product)', () => {
    let createdProduct;

    beforeEach(async () => {
      createdProduct = await Product.create(sampleProduct);
    });

    it('should return single product by valid id with 200 status', async () => {
      const res = await request(app).get(`/products/${createdProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product._id).toBe(String(createdProduct._id));
      expect(res.body.product.name).toBe(sampleProduct.name);
    });

    it('should return 400 when product id format is invalid', async () => {
      const res = await request(app).get('/products/invalid-object-id-123');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid.*id/i);
    });

    it('should return 404 when product is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/products/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Task 5: Search & Category Filtering', () => {
    beforeEach(async () => {
      await Product.create([
        {
          name: 'Mechanical Keyboard',
          description: 'RGB mechanical keyboard',
          price: 2999,
          category: 'Electronics',
          image: 'https://example.com/keyboard.jpg',
          stock: 10
        },
        {
          name: 'Wireless Bluetooth Keyboard',
          description: 'Compact wireless keyboard',
          price: 1999,
          category: 'Electronics',
          image: 'https://example.com/bt-keyboard.jpg',
          stock: 15
        },
        {
          name: 'Denim Jacket',
          description: 'Classic blue denim jacket',
          price: 2499,
          category: 'Fashion',
          image: 'https://example.com/jacket.jpg',
          stock: 8
        },
        {
          name: 'Clean Code Book',
          description: 'A handbook of agile software craftsmanship',
          price: 899,
          category: 'Books',
          image: 'https://example.com/book.jpg',
          stock: 40
        }
      ]);
    });

    it('should search products by name (case-insensitive)', async () => {
      const res = await request(app).get('/products?search=keyboard');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.products.every(p => p.name.toLowerCase().includes('keyboard'))).toBe(true);
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/products?category=Fashion');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.products[0].name).toBe('Denim Jacket');
    });

    it('should combine search and category filter', async () => {
      const res = await request(app).get('/products?search=keyboard&category=Electronics');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.products.every(p => p.category === 'Electronics')).toBe(true);

      const resNoMatch = await request(app).get('/products?search=keyboard&category=Fashion');
      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.count).toBe(0);
    });
  });

  describe('Bonus Challenge: Sorting by Price', () => {
    beforeEach(async () => {
      await Product.create([
        {
          name: 'Item Medium',
          description: 'Medium price item',
          price: 1500,
          category: 'General',
          image: 'https://example.com/med.jpg',
          stock: 10
        },
        {
          name: 'Item Cheap',
          description: 'Cheap item',
          price: 500,
          category: 'General',
          image: 'https://example.com/cheap.jpg',
          stock: 10
        },
        {
          name: 'Item Expensive',
          description: 'Expensive item',
          price: 3500,
          category: 'General',
          image: 'https://example.com/exp.jpg',
          stock: 10
        }
      ]);
    });

    it('should sort products by price ascending (price_asc)', async () => {
      const res = await request(app).get('/products?sort=price_asc');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.products[0].price).toBe(500);
      expect(res.body.products[1].price).toBe(1500);
      expect(res.body.products[2].price).toBe(3500);
    });

    it('should sort products by price descending (price_desc)', async () => {
      const res = await request(app).get('/products?sort=price_desc');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.products[0].price).toBe(3500);
      expect(res.body.products[1].price).toBe(1500);
      expect(res.body.products[2].price).toBe(500);
    });
  });
});
