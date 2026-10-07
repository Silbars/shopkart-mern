require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/product.model');

const sampleProducts = [
  {
    name: 'Noise Cancelling Headphones',
    description: 'Wireless over-ear headphones with active noise cancellation, 30-hour battery life, and crystal-clear acoustic clarity.',
    price: 4999,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    stock: 25
  },
  {
    name: 'Mechanical Keyboard RGB',
    description: 'Customizable mechanical gaming keyboard with tactile blue switches, per-key RGB backlighting, and braided USB-C cable.',
    price: 2999,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    stock: 12
  },
  {
    name: 'Wireless Ergonomic Mouse',
    description: 'High-precision wireless vertical mouse designed for all-day ergonomic comfort and seamless multi-device switching.',
    price: 1499,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    stock: 18
  },
  {
    name: 'Ultra-Slim Smartwatch Pro',
    description: 'Sleek AMOLED display smartwatch with heart rate monitoring, sleep analysis, 5ATM water resistance, and 10-day battery.',
    price: 3499,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    stock: 30
  },
  {
    name: 'Classic Denim Jacket',
    description: 'Timeless vintage wash denim jacket made from 100% sustainable organic cotton with rugged metal hardware.',
    price: 2499,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop&q=80',
    stock: 15
  },
  {
    name: 'Minimalist Leather Sneakers',
    description: 'Handcrafted premium low-top sneakers in clean white Italian leather with cushioned ortholite insoles.',
    price: 3999,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
    stock: 8
  },
  {
    name: 'Waterproof Canvas Backpack',
    description: 'Urban commuter backpack with padded 15.6" laptop compartment, anti-theft zipper, and water-repellent coating.',
    price: 1899,
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    stock: 22
  },
  {
    name: 'Atomic Habits by James Clear',
    description: 'An easy and proven way to build good habits and break bad ones. The definitive masterclass on personal growth.',
    price: 499,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    stock: 50
  },
  {
    name: 'Designing Data-Intensive Applications',
    description: 'The big ideas behind reliable, scalable, and maintainable distributed software systems by Martin Kleppmann.',
    price: 1850,
    category: 'Books',
    image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=800&auto=format&fit=crop&q=80',
    stock: 14
  },
  {
    name: 'Aromatherapy Ceramic Diffuser',
    description: 'Ultrasonic cool mist essential oil diffuser with ambient warm LED nightlight and automatic shut-off safety.',
    price: 1299,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=80',
    stock: 20
  },
  {
    name: 'Stainless Steel Pour-Over Kettle',
    description: 'Gooseneck precision electric kettle with temperature control for barista-quality artisanal coffee brewing.',
    price: 2699,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    stock: 9
  },
  {
    name: 'Solid Wood Minimalist Desk Lamp',
    description: 'Nordic beech wood folding desk lamp with touch dimming, 3 color temperatures, and eye-caring flicker-free LED.',
    price: 1599,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
    stock: 0 // Intentionally 0 to demonstrate out-of-stock UI state
  }
];

const seedProducts = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shopkart';

  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // Count existing products
    const existingCount = await Product.countDocuments();
    console.log(`Found ${existingCount} existing products.`);

    if (existingCount === 0) {
      console.log('Catalog is empty. Inserting sample products...');
      const created = await Product.insertMany(sampleProducts);
      console.log(`Successfully seeded ${created.length} products!`);
    } else {
      console.log('Products already exist. Checking if sample items are present...');
      for (const prod of sampleProducts) {
        const found = await Product.findOne({ name: prod.name });
        if (!found) {
          await Product.create(prod);
          console.log(`+ Added missing sample product: ${prod.name}`);
        }
      }
      console.log('Product catalog verified & synced.');
    }
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
};

if (require.main === module) {
  seedProducts();
}

module.exports = seedProducts;
