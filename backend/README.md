# ShopKart — Customer Authentication Service (Lab 01)

A secure, production-grade Customer Authentication backend service built for the **ShopKart** e-commerce platform using **Node.js, Express.js, MongoDB (Mongoose), bcrypt, jsonwebtoken, and cookie-parser**.

---

## 📁 Project Structure (MVC Architecture)

```text
backend/
│
├── controllers/
│   └── customer.controller.js      # Register, login, profile, logout, change-password
│
├── models/
│   └── customer.model.js           # Mongoose Customer schema & bcrypt hooks
│
├── routes/
│   └── customer.routes.js          # REST endpoints mapping
│
├── middlewares/
│   └── auth.middleware.js          # JWT & HttpOnly cookie protection
│
├── utils/
│   └── generateToken.js            # JWT signing & cookie configuration
│
├── tests/
│   └── auth.test.js                # 16 Jest + Supertest integration tests
│
├── index.js                        # Express app bootstrap & MongoDB connection
├── .env                            # Environment variables
├── .env.example                    # Sample environment template
├── package.json                    # Dependencies & test scripts
├── VIVA_PREP.md                    # In-depth TA Viva answers
└── README.md                       # Documentation & API testing guide
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (or copy `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/shopkart
JWT_SECRET=shopkart_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Run Server

```bash
# Production mode
npm start

# Development mode (auto-reload via nodemon)
npm run dev
```

### 4. Run Automated Test Suite

```bash
npm test
```

*Runs 16 comprehensive integration tests using an in-memory MongoDB server without requiring local MongoDB setup.*

---

## 📡 API Reference & Postman Guide

### 1. Register Customer

- **Method:** `POST`
- **URL:** `http://localhost:5000/customers/register`
- **Auth:** None (Public)
- **Request Body (JSON):**
  ```json
  {
    "fullName": "John Doe",
    "email": "john@gmail.com",
    "password": "john123",
    "phone": "9876543210"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Customer registered successfully",
    "customer": {
      "_id": "664fa1e2b...",
      "fullName": "John Doe",
      "email": "john@gmail.com",
      "phone": "9876543210"
    }
  }
  ```
- **Error Codes:**
  - `400 Bad Request` — Missing required fields or password < 6 characters.
  - `409 Conflict` — Email already exists.

---

### 2. Customer Login

- **Method:** `POST`
- **URL:** `http://localhost:5000/customers/login`
- **Auth:** None (Public)
- **Request Body (JSON):**
  ```json
  {
    "email": "john@gmail.com",
    "password": "john123"
  }
  ```
- **Success Response (200 OK):**
  - Sets **`HttpOnly`** cookie: `token=<jwt_string>; HttpOnly; SameSite=Lax; Max-Age=604800`
  - Response Body:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "customer": {
        "_id": "664fa1e2b...",
        "fullName": "John Doe",
        "email": "john@gmail.com",
        "phone": "9876543210"
      }
    }
    ```
- **Error Codes:**
  - `401 Unauthorized` — Invalid credentials (email or password mismatch).

---

### 3. Get Profile (Protected)

- **Method:** `GET`
- **URL:** `http://localhost:5000/customers/me`
- **Auth:** `HttpOnly` cookie or `Bearer <token>`
- **Success Response (200 OK):**
  ```json
  {
    "_id": "664fa1e2b...",
    "fullName": "John Doe",
    "email": "john@gmail.com",
    "phone": "9876543210"
  }
  ```
- **Error Codes:**
  - `401 Unauthorized` — Missing or invalid token.

---

### 4. Customer Logout (Protected)

- **Method:** `POST`
- **URL:** `http://localhost:5000/customers/logout`
- **Auth:** `HttpOnly` cookie or `Bearer <token>`
- **Success Response (200 OK):**
  - Clears `token` cookie.
  - Response Body:
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

---

### 5. Change Password (Bonus Challenge +10 Marks)

- **Method:** `PATCH`
- **URL:** `http://localhost:5000/customers/change-password`
- **Auth:** `HttpOnly` cookie or `Bearer <token>`
- **Request Body (JSON):**
  ```json
  {
    "oldPassword": "john123",
    "newPassword": "newSecretPassword123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password changed successfully"
  }
  ```
- **Error Codes:**
  - `400 Bad Request` — Incorrect old password or new password < 6 characters.
  - `401 Unauthorized` — User not logged in.

---

## 🧪 Postman & cURL Testing Quick Commands

### Register:
```bash
curl -X POST http://localhost:5000/customers/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@gmail.com","password":"john123","phone":"9876543210"}'
```

### Login (saving cookies to `cookies.txt`):
```bash
curl -X POST http://localhost:5000/customers/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"john@gmail.com","password":"john123"}'
```

### Access Profile using cookie:
```bash
curl -X GET http://localhost:5000/customers/me \
  -b cookies.txt
```

### Change Password:
```bash
curl -X PATCH http://localhost:5000/customers/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"oldPassword":"john123","newPassword":"newSecretPassword123"}'
```

### Logout:
```bash
curl -X POST http://localhost:5000/customers/logout \
  -b cookies.txt
```

---

## 🔒 Security Best Practices Implemented

1. **One-Way Password Hashing (`bcrypt`):** Passwords are salted (10 rounds) and hashed prior to persisting.
2. **Zero Password Leakage:** Schema-level `toJSON` transformation and query-level `.select('-password')` prevent any password exposure in API responses.
3. **XSS Protection (`HttpOnly` Cookies):** Tokens cannot be accessed via client-side JavaScript (`document.cookie`).
4. **CSRF Protection (`sameSite` Attribute):** Strict/Lax cookie policy.
5. **Generic Error Messages on Auth Failure:** `401 Invalid credentials` prevents account enumeration attacks.
