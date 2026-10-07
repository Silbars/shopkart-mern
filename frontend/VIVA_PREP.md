# 🎓 ShopKart — Frontend Engineering Lab 02: TA Viva Preparation

This document contains detailed, high-scoring answers to all **TA Viva Questions** for **Engineering Lab 02 (Frontend Engineering Lab: ShopKart Login → Home Flow)**.

---

### Question 1: Why do we use `withCredentials: true`?

#### Answer:
By default, the browser's `XMLHttpRequest` and `Fetch API` / `Axios` do **not** send or receive cookies, authorization headers, or TLS client certificates during **cross-origin** requests (CORS) for security reasons.

Setting `withCredentials: true` in Axios:
1. **Instructs the browser to include cookies**: Whenever the frontend on `http://localhost:5173` makes an API request to `http://localhost:5001`, the browser automatically attaches the `token` cookie.
2. **Accepts cookies in responses**: It allows the browser to process incoming `Set-Cookie` headers from the backend response and store them in the browser's cookie jar.
3. **Backend CORS requirement**: When `withCredentials: true` is enabled on the client, the backend **must** respond with:
   - `Access-Control-Allow-Credentials: true`
   - A specific `Access-Control-Allow-Origin` (it cannot be the wildcard `*`). In our backend, `cors({ origin: true, credentials: true })` dynamically reflects the requesting origin and enables credentials.

---

### Question 2: Why can't JavaScript read an `HttpOnly` cookie?

#### Answer:
The `HttpOnly` attribute is a browser security standard specifically created to protect sensitive tokens from **Cross-Site Scripting (XSS)** attacks:

1. **Browser Enforcement**: When a server sets a cookie with the `HttpOnly` flag:
   ```http
   Set-Cookie: token=eyJhbGci...; HttpOnly; Secure; SameSite=Lax
   ```
   the browser's JavaScript runtime strictly hides this cookie from `document.cookie`.
2. **Mitigation of Token Theft**: If an attacker injects malicious JavaScript into the web application (e.g., via compromised third-party scripts, unescaped comments, or vulnerable dependencies), the script **cannot access or exfiltrate** the `token` cookie to an attacker-controlled server.
3. **Transparent Transmission**: Even though JavaScript cannot inspect or modify the cookie value, the browser will automatically and securely attach it in the `Cookie` HTTP header on subsequent network requests to the matching origin.

---

### Question 3: Why is `/home` called a "protected route"?

#### Answer:
A **protected route** is a client-side or server-side resource that requires the visitor to have an authenticated and active session before they are granted access:

1. **Client-side Route Guard**: In our React application, `<ProtectedRoute>` inspects the authentication status (`isAuthenticated`, `user`). If no active session exists:
   - Access to `<Home />` is immediately blocked.
   - The user is redirected to `/login` via `<Navigate to="/login" replace />`.
2. **Server-side Security Boundary**: Client-side redirection is just UI convenience; true security resides at the API level. When `/home` loads, it triggers `GET /customers/me`. The Express backend `authMiddleware` verifies the JWT inside the HttpOnly cookie. If the token is missing, expired, or tampered with, the backend responds with `401 Unauthorized`.
3. **Defense in Depth**: Combining client-side route guards with server-side token validation guarantees that unauthenticated users cannot view sensitive customer data.

---

### Question 4: Why do we fetch `/customers/me` instead of storing the user manually (e.g., in `localStorage`)?

#### Answer:
Fetching the authenticated customer profile from `GET /customers/me` on startup offers major architectural and security benefits:

1. **Single Source of Truth**: The backend database is the ultimate authority on user profile state. If an administrator bans the account, changes permissions, or if the customer changes their details in another session, fetching `/customers/me` ensures the frontend always reflects accurate, real-time data.
2. **Prevention of Session Desynchronization**: If user details were stored in `localStorage`, clearing the cookie or having the cookie expire on the server would leave stale user data in `localStorage`. The UI might show the user as logged in when their API calls are failing with 401s.
3. **XSS Vulnerability Defense**: `localStorage` is accessible to any JavaScript running on the page. Storing sensitive user data or tokens in `localStorage` exposes them to XSS exfiltration. Using `GET /customers/me` powered by an `HttpOnly` cookie eliminates this risk.
4. **Instant Invalidation**: When the user clicks Logout or the token expires, the backend clears the cookie. The next call to `/customers/me` fails immediately with 401, causing the app to reset and redirect to login cleanly.

---

### Question 5: What is the difference between Authentication and Authorization?

#### Answer:

| Feature | Authentication (AuthN) | Authorization (AuthZ) |
| :--- | :--- | :--- |
| **Definition** | Verifies **who you are** (identity verification). | Determines **what you can do** (access permissions & privileges). |
| **Question Answered** | *"Are you really who you claim to be?"* | *"Do you have permission to access this resource or perform this action?"* |
| **Mechanism** | Email/Password, OTP, Biometrics, SSO, JWT signature validation. | Roles (Admin, Customer, Vendor), RBAC (Role-Based Access Control), scopes/permissions. |
| **Lab Example** | `POST /customers/login` verifies email and bcrypt password hash, then issues an HttpOnly JWT cookie. | Ensuring a standard customer cannot delete other users' accounts or access an Admin-only inventory dashboard. |
| **Order of Execution** | **Must occur first**: A user must be authenticated before permissions can be evaluated. | Occurs **after authentication** has established user identity. |
| **HTTP Status Code** | Failure returns **`401 Unauthorized`** (unauthenticated / bad credentials). | Failure returns **`403 Forbidden`** (authenticated, but lacking required permissions). |

---

### Summary Checklist for TA Evaluation
- [x] **withCredentials: true** configured in `src/services/api.js`.
- [x] **HttpOnly Cookie** automatically handled by browser, hidden from JS.
- [x] **Protected `/home`** guarded by `ProtectedRoute.jsx` and verified against `GET /customers/me`.
- [x] **Dynamic Auth Sync** using `useAuth()` Context and `GET /customers/me`.
- [x] **Clean Error Handling & Logout** with `POST /customers/logout` and navigation to `/login`.

---

# 🛒 Lab 03 — Product Catalog & Discovery TA Viva Questions

### Question 6: How does `.map()` help us render products dynamically?

#### Answer:
1. **Declarative Array-to-JSX Transformation**:
   In React, `.map()` iterates through the array of product objects retrieved from `GET /products` and returns a corresponding JSX component for each item:
   ```jsx
   <div className="products-grid">
     {products.map((product) => (
       <ProductCard key={product._id} product={product} />
     ))}
   </div>
   ```
2. **Reactivity**: When search or category filters change the state (`setProducts`), React automatically invokes `.map()` on the new array to re-render the view without manual DOM manipulation (`innerHTML`, `appendChild`).
3. **The `key` prop (`key={product._id}`)**:
   Provides each rendered element with a stable identity. During Virtual DOM reconciliation, React uses this key to determine precisely which elements were inserted, updated, or reordered (e.g. during price sorting), minimizing real browser DOM updates.

---

### Question 7: Why do we need loading, error, and empty states in a frontend application?

#### Answer:
1. **Loading State (`loading === true`)**:
   - Asynchronous API calls take time (network latency, DNS lookup, database query).
   - Showing a spinner with `"Loading products..."` gives immediate feedback that the app is working, preventing the user from seeing a broken or blank screen.
2. **Error State (`error !== null`)**:
   - Handles network disconnection, server crashes (500), or bad requests gracefully.
   - Displays a clear, actionable message with a **"Try Again"** button to allow user recovery.
3. **Empty State (`!loading && !error && products.length === 0`)**:
   - Distinguishes between "products are still loading" and "your search returned 0 results".
   - Shows a friendly illustration and a **"Clear All Filters"** button so the user is never stranded on an empty screen.

---

### Question 8: What happens when the backend returns an empty array?

#### Answer:
1. **HTTP Status**: The backend responds with `200 OK` (not 404), because the query executed successfully but zero documents matched the search or category filter.
2. **Frontend UI Reaction**:
   - Without an explicit condition, rendering `{products.map(...)}` produces 0 cards, leaving a completely blank container that confuses the user.
   - We check `if (!loading && !error && products.length === 0)` and render an **Empty State** card instructing the user to adjust their search criteria or reset filters.

---

### Question 9: Why should API/service logic be separated from UI components?

#### Answer:
In ShopKart, all Axios network calls are isolated inside `src/services/api.js` rather than being written directly inside `Products.jsx` or `Home.jsx`:

1. **Separation of Concerns (Single Responsibility Principle)**:
   - UI components focus strictly on **presentation, layout, and user interactions**.
   - The service layer focuses on **HTTP configuration, baseURL, interceptors, and error formatting**.
2. **Reusability (DRY)**:
   - Methods like `getProducts()` or `getProductById()` can be reused by multiple pages (catalog, recommendations, search suggestions) without duplicating Axios requests.
3. **Centralized Maintenance**:
   - If the backend URL or headers change, we update `api.js` in one place instead of modifying dozens of UI files.
4. **Testability**:
   - Service functions can be mocked easily during component unit tests without creating real network requests.

