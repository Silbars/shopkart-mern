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
