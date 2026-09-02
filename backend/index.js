require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const customerRoutes = require('./routes/customer.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shopkart';

// Core Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Health Check / Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ShopKart Customer Authentication Service is running'
  });
});

// Mount Routes
app.use('/customers', customerRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Database Connection & Server Start (only if not running under Jest test runner)
if (process.env.NODE_ENV !== 'test') {
  let connectionUri = process.env.MONGO_URI;

  // Support password-protected connection via separate variables if preferred
  if (!connectionUri && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_HOST) {
    const encodedUser = encodeURIComponent(process.env.DB_USER);
    const encodedPassword = encodeURIComponent(process.env.DB_PASSWORD);
    const dbName = process.env.DB_NAME || 'shopkart';
    connectionUri = `mongodb+srv://${encodedUser}:${encodedPassword}@${process.env.DB_HOST}/${dbName}?retryWrites=true&w=majority`;
  }

  const finalUri = connectionUri || 'mongodb://127.0.0.1:27017/shopkart';

  mongoose
    .connect(finalUri, {
      serverSelectionTimeoutMS: 8000
    })
    .then(() => {
      console.log('Successfully connected to MongoDB.');
      app.listen(PORT, () => {
        console.log(`ShopKart Authentication Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Database connection failed:', err.message);
      if (err.message.includes('SSL alert') || err.message.includes('Could not connect to any servers')) {
        console.error('\n⚠️  MongoDB Atlas Connection Tip:');
        console.error('Atlas blocked the connection because the client IP is not whitelisted.');
        console.error('Please visit MongoDB Atlas -> Security -> Network Access -> Add IP Address -> "Allow Access From Anywhere" (0.0.0.0/0).\n');
      }
      process.exit(1);
    });
}

module.exports = app;
