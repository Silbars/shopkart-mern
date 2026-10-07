# TA Viva Preparation Guide — ShopKart Authentication Service

This document contains in-depth, interview-ready answers to the TA viva questions for **Engineering Lab 01 (ShopKart Customer Authentication Service)**.

---

## 1. Why do we use `bcrypt` instead of encrypting passwords?

### Core Answer:
- **Hashing vs. Encryption:**
  - **Encryption is two-way:** Encrypted data can be decrypted back into plain text using a secret decryption key. If an attacker gains access to the database and the encryption key (or compromises the server), all user passwords are exposed.
  - **Hashing is one-way:** A cryptographic hash function converts the password into an irreversible fixed-length string. There is mathematically no function to "un-hash" it.
- **Why `bcrypt` specifically?**
  1. **Built-in Salt (`genSalt`):** bcrypt generates a unique random salt for each password before hashing, which defends against **Rainbow Table Attacks** and prevents identical passwords from producing the same hash.
  2. **Adaptive Cost Factor / Work Factor (e.g. 10 rounds):** bcrypt is intentionally slow and computationally expensive. As hardware speeds up, we can increase the salt rounds (e.g. 10 $\rightarrow$ 12 $\rightarrow$ 14) to make **Brute-force** and **Dictionary attacks** computationally infeasible.

---

## 2. What information is typically stored inside a JWT payload?

### Core Answer:
- A JWT (JSON Web Token) payload typically contains:
  1. **User Identifier (`id` / `_id` / `sub`):** The unique database identifier of the authenticated user to look up the user record in subsequent requests.
  2. **Role or Permissions (`role`):** (e.g., `customer`, `admin`) for role-based authorization checks.
  3. **Standard Registered Claims:**
     - `iat` (Issued At timestamp)
     - `exp` (Expiration timestamp, e.g., 7 days)
- **What should NEVER be in a JWT payload?**
  - Sensitive secrets such as **passwords**, **credit card details**, or **SSNs**.
  - *Reason:* The JWT payload is only Base64URL-encoded (not encrypted) and can be decoded and read by anyone who possesses the token string (`jwt.io`). The cryptographic signature only guarantees integrity/tamper-proofing, not confidentiality.

---

## 3. Why is the `HttpOnly` flag important for cookies?

### Core Answer:
- **Defense against XSS (Cross-Site Scripting):**
  - When a cookie has `httpOnly: true`, client-side JavaScript (e.g., `document.cookie`) **cannot access or read** the cookie.
  - If a malicious script is injected into the frontend (via an XSS vulnerability), the attacker cannot steal the session JWT token stored in an `HttpOnly` cookie.
- **Best Practices for Auth Cookies:**
  - `httpOnly: true` — Blocks JavaScript access.
  - `secure: true` (in production) — Ensures the cookie is transmitted only over encrypted HTTPS connections.
  - `sameSite: 'strict'` or `'lax'` — Protects against CSRF (Cross-Site Request Forgery) attacks.

---

## 4. Why should passwords never be returned to the frontend?

### Core Answer:
1. **Exposure in Transit and Logs:** Sending password hashes over the network increases the attack surface: hashes can be logged in browser history, proxy caches, API response monitors, or frontend state management tools (Redux, Pinia, DevTools).
2. **Offline Cracking Hazard:** Even though bcrypt is strong, giving a hash to a client allows a malicious actor to run offline GPU-based dictionary cracking tools (like Hashcat or John the Ripper).
3. **Principle of Least Privilege / Data Minimization:** The frontend never needs the password (or even the hash) after authentication. Only identity fields (`_id`, `fullName`, `email`, `phone`) are necessary for UI presentation.
4. **Mongoose `toJSON` / `.select('-password')` Defense:** We use `.select('-password')` in queries and `delete customerObject.password` in Mongoose schema `toJSON` methods to guarantee zero leakage.

---

## 5. What is the purpose of authentication middleware?

### Core Answer:
1. **Route Protection & Gatekeeping:** Acts as a reusable pipeline step that runs before protected controller actions (e.g. `GET /customers/me`, `POST /customers/logout`, `PATCH /customers/change-password`).
2. **Token Extraction & Verification:** Extracts the JWT from incoming request cookies (`req.cookies.token`), verifies the signature and expiration using `jwt.verify(token, secret)`.
3. **User Context Injection:** Fetches the active user from MongoDB (verifying they still exist and have not been deleted/banned) and attaches the user model to `req.user`.
4. **Separation of Concerns:** Keeps controller logic clean and focused solely on business logic rather than repeating token verification in every endpoint. If authentication fails, it terminates the request immediately with a `401 Unauthorized` status.

---

# Part 2 — Lab 03 Product Catalog & Discovery Viva Questions

## 6. Why should product data come from MongoDB instead of being hardcoded in React?
- **Single Source of Truth**: Dynamic pricing, inventory changes, and new product listings do not require rebuilding or redeploying the React frontend.
- **Concurrent Stock Integrity**: Prevents race conditions and overselling; when stock drops to 0, all clients immediately see `"Out of stock"`.
- **Security & Authorization**: Business rules, price validation, and discount calculations must be verified by the backend to prevent malicious client-side price tampering.
- **Payload & Memory Scalability**: Querying indexed collections avoids loading tens of thousands of items into client browser memory.

---

## 7. What is the difference between a URL parameter and a query parameter?
- **URL Parameter (`/products/:id`)**:
  - Embedded directly into the route path.
  - Used to identify a **specific, singular entity** (e.g. `req.params.id` in Express).
  - Returns `404 Not Found` if the item does not exist, or `400` if ID format is invalid.
- **Query Parameter (`/products?category=Electronics&search=phone`)**:
  - Appended after the `?` delimiter as key-value pairs separated by `&`.
  - Used for **filtering, searching, sorting, and pagination** across a collection (e.g. `req.query.search`).
  - Returns `200 OK` with an empty array `[]` if no documents match the filter.

---

## 8. When would you use `/products/:id` vs `/products?category=Electronics`?
- **`/products/:id`**: When fetching the complete specification of a single item for the **Product Details Page**.
- **`/products?category=Electronics`**: When filtering the catalog collection to browse items belonging to the Electronics category. Returns `{ success: true, count, products: [...] }`.

---

## 9. Why should search/filtering be handled by the backend instead of filtering only in React?
- **Database Indexing**: MongoDB utilizes B-Tree and text indexes in RAM (`$regex`, `$text`) to search across millions of documents in sub-milliseconds.
- **Bandwidth Reduction**: Avoids sending a 50MB JSON database dump to mobile browsers; transmits only matching results (e.g., 2KB).
- **Pagination Integrity**: Client-side filtering can only filter items currently loaded in React state (e.g., page 1). Backend filtering guarantees search across the entire catalog.

---

## 10. How does dynamic price sorting work in Mongoose?
- Query parameter `?sort=price_asc` maps to `{ price: 1 }` (ascending).
- Query parameter `?sort=price_desc` maps to `{ price: -1 }` (descending).
- Default sort is `{ createdAt: -1 }` (newest first).
- Using `Product.find(filter).sort(sortOptions)` ensures the database performs the sort leveraging indexes before transmitting results.

