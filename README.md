# 🛒 ShopKart — MERN E-commerce with Razorpay Checkout

ShopKart is a full-stack shopping app built with **MongoDB, Express, React and Node.js**.
A customer can register, browse and search products, save a wishlist, manage a cart, check out with a
shipping address, pay through **Razorpay (Test Mode)**, and see their order history.

```text
Register / Login → Browse Products → Wishlist → Cart → Checkout → Razorpay Payment
→ Signature Verification → Order Placed → Cart Cleared → My Orders
```

---

## ✨ Features

| Area | What it does |
|---|---|
| **Authentication** | Register, login, logout, change password. JWT stored in an `httpOnly` cookie, passwords hashed with bcrypt |
| **Product catalogue** | Product list with search/filter, product details, live stock badges |
| **Wishlist** | Add, remove, toggle — saved per customer in MongoDB |
| **Cart** | Add, update quantity, remove; global cart state shared across the app (navbar count updates instantly) |
| **Checkout** | Shipping form with client- *and* server-side validation, final order summary |
| **Payments** | Razorpay Standard Checkout in Test Mode, HMAC-SHA256 signature verification on the server |
| **Orders** | Purchase-time snapshot of items and prices, order confirmation page, My Orders, order details |
| **Order tracking (bonus)** | Development-only endpoint to move an order PLACED → CONFIRMED → SHIPPED → DELIVERED |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Context API, Axios, Vite, lucide-react icons |
| Backend | Node.js, Express 4, Mongoose 8, JSON Web Tokens, bcryptjs, cookie-parser, CORS |
| Database | MongoDB (Atlas or local) |
| Payments | Razorpay Node SDK (Test Mode) + Node's built-in `crypto` |

---

## 📁 Project Structure

```text
.
├── package.json                  # root scripts: run backend + frontend together
├── backend/
│   ├── index.js                  # Express app, routes, MongoDB connection
│   ├── .env.example              # template for backend/.env
│   ├── config/razorpay.js        # Razorpay client (test keys from .env)
│   ├── controllers/              # customer, product, wishlist, cart, order logic
│   ├── middlewares/auth.middleware.js   # verifies the JWT, sets req.user
│   ├── models/                   # Customer (with cart + wishlist), Product, Order
│   ├── routes/                   # /customers /products /wishlist /cart /orders
│   └── utils/                    # token helper, shipping validation, product seeder
└── frontend/
    ├── vite.config.js            # dev server on :5173, proxies API calls to :5001
    └── src/
        ├── App.jsx               # routes
        ├── context/              # AuthContext, CartContext (global state)
        ├── pages/                # Home, Products, ProductDetails, Wishlist, Cart,
        │                         # Checkout, OrderSuccess, Orders, OrderDetails, Login, Register
        ├── components/           # Navbar, ProductCard, CartItem, CheckoutForm, OrderCard, ...
        ├── services/api.js       # Axios instance + API calls
        └── utils/                # formatting, Razorpay script loader, form validation
```

---

## ✅ Prerequisites

- **Node.js 18+** and npm
- **MongoDB** — a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster, or MongoDB running locally
- **Razorpay account** in **Test Mode** (free) — no real money is ever charged

---

## 🚀 Setup & Run

### 1. Clone and install

```bash
git clone <this-repo-url> shopkart
cd shopkart
npm run install:all      # installs root, backend and frontend dependencies
```

### 2. Create `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Then fill in your own values:

| Variable | Description |
|---|---|
| `PORT` | Backend port. Keep **5001** — the frontend dev proxy forwards API calls there |
| `MONGO_URI` | MongoDB connection string, e.g. Atlas `mongodb+srv://...` or `mongodb://127.0.0.1:27017/shopkart` |
| `JWT_SECRET` | Any long random string used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `NODE_ENV` | `development` (the bonus order-status endpoint is disabled in `production`) |
| `RAZORPAY_KEY_ID` | Test key ID — starts with `rzp_test_` |
| `RAZORPAY_KEY_SECRET` | Test key secret — **server only, never commit it** |

**Getting Razorpay test keys:** Razorpay Dashboard → switch to **Test Mode** → *Account & Settings* → *API Keys* → *Generate Test Key*.

**Using Atlas?** Under *Network Access*, allow your current IP address, otherwise the backend cannot connect.

> `.env` is listed in `.gitignore` — only `.env.example` (placeholders) is committed.
> The frontend needs no `.env`.

### 3. Seed sample products

```bash
npm run seed
```

Adds 13 sample products. It only inserts when the products collection is empty, so it is safe to run again.

### 4. Start the app

```bash
npm run dev
```

This starts both servers:

- Frontend: **http://localhost:5173** ← open this
- Backend API: http://localhost:5001

You can also run them separately with `npm run dev:backend` and `npm run dev:frontend`.

### 5. Make a test purchase

1. Register an account and log in.
2. Add a product to the cart → **Proceed to Checkout**.
3. Fill in the shipping form (10-digit mobile number, 6-digit pincode) → **Place Order**.
4. In the Razorpay test popup, pay with a test method — e.g. **UPI ID `success@razorpay`**, or a card from
   [Razorpay's test card list](https://razorpay.com/docs/payments/payments/test-card-details/).
5. You land on the **Order Placed** page, the navbar shows **Cart (0)**, and the order appears under **My Orders**.

To see the failure path, use UPI ID `failure@razorpay`: an error is shown and the cart is kept.

---

## 📜 Scripts (from the project root)

| Command | Does |
|---|---|
| `npm run install:all` | Install root, backend and frontend dependencies |
| `npm run dev` | Run backend (nodemon) and frontend (Vite) together |
| `npm run dev:backend` / `npm run dev:frontend` | Run one side only |
| `npm start` | Run the backend with plain Node |
| `npm run seed` | Insert sample products into an empty database |
| `npm run build:frontend` | Production build of the React app into `frontend/dist` |

---

## 💳 Checkout & Payment Flow

```text
React Checkout                         Express API                              Razorpay
──────────────                         ───────────                              ────────
validate shipping form
POST /orders/create-payment-order ──▶  read cart from DB (never from client)
  body: { shippingAddress }            reload products → check existence + stock
                                       snapshot name/price/image, total on server
                                       save Order (PENDING_PAYMENT)
                                       create Razorpay order (amount in paise) ─────▶ order_id
◀── { shopKartOrderId, razorpayOrderId, amount, currency, key ID }
open Razorpay Checkout ────────────────────────────────────────────────────────────▶ test payment
◀───────────────────────────────── payment_id, order_id, signature ─────────────────
POST /orders/verify-payment ───────▶  order must belong to the logged-in user
                                       order_id must match the one stored in DB
                                       HMAC-SHA256(order_id|payment_id, key secret) == signature?
                                       ✔ mark PAID / PLACED, reduce stock, clear cart
◀── { order }
clear cart state → /order-success/:id
```

**Business rules enforced on the server**

- Items, prices and the total are always computed from MongoDB; a `totalAmount` sent by the client is ignored.
- Stock is re-checked at checkout; an order fails with `400 Insufficient stock for <product>` if it ran out.
- Orders store a **snapshot** of each item's name, price and image, so old orders don't change when a product does.
- An order becomes **PAID** only after the signature is verified; a fake or missing signature returns `400` and leaves the cart untouched.
- The cart is cleared **only after** successful verification.
- Verification is idempotent — a double submit cannot reduce stock twice.
- A customer can only read their own orders; anyone else's order returns `404`.
- The Razorpay **key secret never leaves the server**; only the key ID is sent to the browser.

---

## 🔌 API Reference

Base URL: `http://localhost:5001`. 🔒 = requires login (JWT cookie or `Authorization: Bearer <token>`).

### Customers
| Method | Endpoint | | Purpose |
|---|---|:-:|---|
| POST | `/customers/register` | | Create an account |
| POST | `/customers/login` | | Log in, sets the auth cookie |
| GET | `/customers/me` | 🔒 | Current customer's profile |
| POST | `/customers/logout` | 🔒 | Clear the auth cookie |
| PATCH | `/customers/change-password` | 🔒 | Change password |

### Products
| Method | Endpoint | | Purpose |
|---|---|:-:|---|
| GET | `/products` | | List products — optional `?search=`, `?category=`, `?sort=` |
| GET | `/products/:id` | | One product |
| POST | `/products` | | Create a product (development / seeding) |

### Wishlist
| Method | Endpoint | | Purpose |
|---|---|:-:|---|
| GET | `/wishlist` | 🔒 | Customer's wishlist |
| POST | `/wishlist/:productId` | 🔒 | Add product |
| DELETE | `/wishlist/:productId` | 🔒 | Remove product |
| PATCH | `/wishlist/:productId/toggle` | 🔒 | Add or remove |

### Cart
| Method | Endpoint | | Purpose |
|---|---|:-:|---|
| GET | `/cart` | 🔒 | Customer's cart |
| POST | `/cart/:productId` | 🔒 | Add product |
| PATCH | `/cart/:productId` | 🔒 | Update quantity |
| DELETE | `/cart/:productId` | 🔒 | Remove product |

### Orders
| Method | Endpoint | | Purpose |
|---|---|:-:|---|
| POST | `/orders/create-payment-order` | 🔒 | Validate cart, create pending order + Razorpay order |
| POST | `/orders/verify-payment` | 🔒 | Verify signature, mark order PAID/PLACED, clear cart |
| GET | `/orders` | 🔒 | Customer's placed orders, newest first |
| GET | `/orders/:id` | 🔒 | One order (owner only) |
| PATCH | `/orders/:id/status` | 🔒 | *Bonus, dev only:* advance order status one step |

**Example — create payment order**

```http
POST /orders/create-payment-order
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "Aarav Sharma",
    "phone": "9876543210",
    "addressLine1": "22 MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560001"
  }
}
```

```json
{
  "success": true,
  "shopKartOrderId": "67abc123...",
  "razorpayOrderId": "order_ABC123",
  "amount": 749700,
  "currency": "INR",
  "key": "rzp_test_..."
}
```

---

## 🧭 Frontend Routes

| Path | Page | Login |
|---|---|:-:|
| `/` | Redirects to `/home` (logged in) or `/login` | |
| `/home` | Home | 🔒 |
| `/register`, `/login` | Auth | |
| `/products`, `/products/:id` | Catalogue & product details | |
| `/wishlist` | Wishlist | 🔒 |
| `/cart` | Cart | 🔒 |
| `/checkout` | Shipping form + order summary + payment | 🔒 |
| `/order-success/:id` | Order confirmation | 🔒 |
| `/orders`, `/orders/:id` | My Orders & order details | 🔒 |

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Database connection failed` on startup | Check `MONGO_URI`; on Atlas, allow your IP under *Network Access* |
| Checkout says **"Payment is not configured"** (503) | Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `backend/.env` and restart the backend |
| API calls fail / 404 from the frontend | Make sure the backend runs on port **5001** (the Vite proxy target) |
| Products page is empty | Run `npm run seed` |
| Razorpay popup does not open | The checkout script loads from `checkout.razorpay.com` — check your internet connection / ad-blocker |

---

## 🔐 Security Notes

- Secrets live only in `backend/.env`, which is git-ignored.
- Passwords are hashed with bcrypt; the JWT is sent as an `httpOnly` cookie.
- All cart, wishlist and order routes are protected by the auth middleware, and the customer is always taken from the token — never from the request body.
- No card details are ever handled by ShopKart; payment data stays inside Razorpay Checkout.
