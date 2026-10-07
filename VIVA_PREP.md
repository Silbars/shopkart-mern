# 🎓 ShopKart — Fullstack Engineering Lab 03: TA Viva Preparation Guide
## Product Catalog & Discovery

This document contains in-depth, interview-ready answers with technical diagrams, code snippets, and rationale for all **TA Viva Questions** for **Engineering Lab 03**.

---

## Quick Reference Table

| Question # | Topic | Key Concepts |
|:---:|:---|:---|
| **Q1** | MongoDB vs Hardcoding | Single Source of Truth, Scalability, Dynamic Inventory, Security |
| **Q2** | URL Params vs Query Params | Entity Identifier (`:id`) vs Filter/Search (`?search=...`), Syntax & Access |
| **Q3** | `/products/:id` vs `/products?category=...` | Single Entity Retrieval (404 on missing) vs Collection Filtering (200 with `[]`) |
| **Q4** | Dynamic Rendering via `.map()` | Array Transformation, Declarative UI, Virtual DOM, `key` prop & Reconciliation |
| **Q5** | Loading & Error States | Asynchronous Latency, UX Feedback, Graceful Recovery, Retry Mechanisms |
| **Q6** | Empty Array Response Handling | `200 OK` vs `404`, Empty State Pattern, Recovery via "Clear Filters" |
| **Q7** | Backend vs Frontend Filtering | Network Bandwidth, B-Tree & Text Indexes, Memory Limits, Pagination Integrity |
| **Q8** | Separation of API & UI Logic | Single Responsibility, Reusability (DRY), Maintainability, Mockability |

---

## 1. Why should product data come from MongoDB instead of being hardcoded in React?

### Core Answer:
1. **Single Source of Truth & Zero Redeployment**:
   - In e-commerce, prices, descriptions, and promotions fluctuate constantly.
   - If products are hardcoded inside React components (e.g., in a local JavaScript array), any change requires modifying source code, running a build pipeline (`npm run build`), and redeploying the web application.
   - Storing products in **MongoDB** completely decouples data from code. Changes made in the database or admin dashboard reflect instantaneously for all customers without any deployment.

2. **Real-time Inventory Consistency**:
   - Stock counts change whenever customers purchase items.
   - A centralized database ensures that when item stock drops from `10` to `0`, all customers immediately see `"Out of stock"`. Hardcoded data is static and cannot maintain concurrency or live inventory state across multiple users.

3. **Performance & Client Resource Optimization**:
   - Hardcoding thousands of products into React bundles creates massive JavaScript files (`bundle.js`), resulting in slow download times, high First Contentful Paint (FCP), and heavy memory consumption on mobile devices.
   - A database allows fetching only what the client needs on demand via query parameters and pagination.

4. **Security & Financial Integrity**:
   - Pricing and stock validations must reside on the backend. If product prices were embedded in client-side code, malicious users could alter JavaScript memory before checkout to purchase products at manipulated prices.

---

## 2. What is the difference between a URL parameter and a query parameter?

### Comparison Matrix:

| Feature | URL Parameter (Path Param) | Query Parameter |
|:---|:---|:---|
| **Syntax** | Part of the path: `/products/:id` $\rightarrow$ `/products/66d123abc456` | Appended with `?` and `&`: `/products?search=keyboard&category=Electronics` |
| **Primary Purpose** | Identifies a **specific, unique entity** hierarchically. | **Filters, sorts, searches, or paginates** a collection of resources. |
| **Requirement** | Usually **mandatory** to match the route. | **Optional**; the endpoint returns a default collection if omitted. |
| **Express Access** | `req.params.id` | `req.query.search`, `req.query.category` |
| **React Router Access**| `const { id } = useParams();` | `const [searchParams] = useSearchParams();` |
| **Missing Resource** | Returns **`404 Not Found`** if the ID doesn't exist. | Returns **`200 OK`** with an empty array `[]` if no matches are found. |

---

## 3. When would you use `/products/:id` vs `/products?category=Electronics`?

### Core Answer:

- **Use `/products/:id` (URL Parameter)**:
  - When the user wants to view the **Product Details Page** of one specific product.
  - The parameter identifies a unique MongoDB `_id` (`66d123...`).
  - **Expected API Response**: A single JSON object:
    ```json
    { "success": true, "product": { "_id": "...", "name": "Mechanical Keyboard", ... } }
    ```
  - **Failure Case**: If the ID does not exist in the database, the server returns **`404 Not Found`**; if the format is invalid, it returns **`400 Bad Request`**.

- **Use `/products?category=Electronics` (Query Parameter)**:
  - When the user is browsing the **Product Catalog Page** and wants to view a subset of products matching a criteria.
  - Category is a descriptive attribute of items, not a resource identity.
  - **Expected API Response**: A JSON array of matching documents:
    ```json
    { "success": true, "count": 4, "products": [ ... ] }
    ```
  - **Empty Case**: If no products exist in that category, the query is still valid and returns **`200 OK`** with `count: 0` and `products: []`.

---

## 4. How does `.map()` help us render products dynamically?

### Core Answer:
1. **Declarative List Transformation**:
   - The `.map()` method transforms an array of raw product data objects from the API into an array of React JSX elements:
     ```jsx
     <div className="products-grid">
       {products.map((product) => (
         <ProductCard key={product._id} product={product} />
       ))}
     </div>
     ```

2. **Reactivity & Automatic UI Sync**:
   - When the user searches or selects a category, React updates the `products` state via `setProducts(data.products)`.
   - React automatically re-evaluates the JSX, and `.map()` transforms the new data array into DOM nodes without requiring manual, error-prone DOM manipulation (`document.createElement` or `innerHTML`).

3. **Role of the `key` prop (`key={product._id}`)**:
   - React uses the `key` prop during **Reconciliation** (Virtual DOM diffing).
   - A unique, stable key (like MongoDB's `_id`) tells React which items were added, removed, or re-ordered when sorting or filtering.
   - Without unique keys, React would be forced to re-render the entire list from scratch on every state update, degrading performance.

---

## 5. Why do we need loading and error states in a frontend application?

### Core Answer:
1. **The Nature of Asynchronous Operations**:
   - Network requests are not instantaneous—they depend on network latency, server load, and database query execution.
   
2. **Loading State (`loading === true`)**:
   - **User Feedback**: Informs the user that their action was recognized and data is being fetched (`"Loading products..."` with an animated spinner).
   - **Prevents False Impressions**: Without a loading indicator, a customer might think the catalog is empty or that the website has frozen.
   - **Prevents Duplicate Actions**: Disables interactive buttons to prevent duplicate network calls.

3. **Error State (`error !== null`)**:
   - **Graceful Degradation**: Real-world networks experience timeouts, 500 server errors, or CORS issues.
   - **User Understanding**: Rather than crashing the entire app with a blank screen or broken UI, it displays a polite error banner (`"Something went wrong while loading products."`).
   - **Actionable Recovery**: Provides a **"Try Again" (retry)** button so the user can easily re-attempt the request without refreshing the whole browser.

---

## 6. What happens when the backend returns an empty array?

### Core Answer:
1. **HTTP Status Code**:
   - The backend returns **`200 OK`** with `{ "success": true, "count": 0, "products": [] }`.
   - *Why not 404?* A search or filter that finds 0 results is still a completely successful database query; 404 is reserved for non-existent endpoints or missing single resources.

2. **Frontend UI Handling (Empty State)**:
   - If the frontend simply renders `.map()`, an empty array produces zero elements, leaving a blank, uninformative screen.
   - Our ShopKart implementation implements a dedicated **Empty State** condition:
     ```jsx
     {!loading && !error && products.length === 0 && (
       <div className="state-card empty-state">
         <PackageOpen size={42} />
         <h2>No products found.</h2>
         <p>Try changing your search keywords or category.</p>
         <button onClick={handleClearFilters}>Clear All Filters</button>
       </div>
     )}
     ```
   - This explicitly reassures the user that the system is functioning correctly and provides an immediate recovery path (**"Clear All Filters"**).

---

## 7. Why should search/filtering be handled by the backend instead of filtering a huge dataset only in React?

### Core Answer:

```text
[Client-side Filtering Problem]
Database (100,000 products) ──> Transfer 50MB JSON ──> Browser Memory Crushed / Laggy Search

[Backend Dynamic Query Architecture]
Client (?search=keyboard) ──> Express (Build Query) ──> MongoDB (Indexed B-Tree Scan)
                                                                 │
Client <── Transfer only 2 matching items (2KB JSON) <───────────┘
```

1. **Network Bandwidth & Payload Size**:
   - Real-world production catalogs contain 50,000+ items.
   - Downloading all items to the browser would require transmitting tens of megabytes on initial load, consuming cellular data and causing 10+ second load times.
   - Backend filtering transmits only the matched documents (e.g. 5 KB).

2. **Database Indexing & Algorithmic Speed**:
   - MongoDB uses **B-Tree indexes** and **Text indexes** stored in RAM. A query like `{ name: { $regex: 'keyboard', $options: 'i' } }` or `{ category: 'Electronics' }` executes in sub-milliseconds across millions of records.
   - JavaScript's `Array.prototype.filter()` on millions of objects in the single-threaded browser UI thread freezes user interactions.

3. **Pagination Integrity**:
   - In production, data is paginated (e.g., 20 items per page).
   - If you filter in React, you can only filter the 20 items currently in client memory—items on pages 2 through 100 will never be found! Backend filtering guarantees global search across the entire catalog.

---

## 8. Why should API/service logic be separated from UI components?

### Core Answer:
In ShopKart, all Axios network calls live in `src/services/api.js`, while UI components live in `src/components/` and `src/pages/`.

1. **Separation of Concerns (Single Responsibility Principle)**:
   - UI components (`Products.jsx`, `ProductDetails.jsx`) should only care about **how things look and respond to user events**.
   - The service layer (`api.js`) handles **how data is transmitted, base URLs, credentials, and error interceptors**.

2. **Reusability & DRY (Don't Repeat Yourself)**:
   - Functions like `getProducts()` or `getProductById()` can be called by multiple components (e.g. Products page, Home page, related products carousel) without duplicating Axios boilerplate.

3. **Maintainability & Centralized Configuration**:
   - If the backend base URL changes, or if an auth header changes, we modify **one line** in `api.js` instead of finding and editing dozens of individual React files.

4. **Testing & Mockability**:
   - Decoupled API functions make unit testing straightforward. When testing `Products.jsx`, we can mock `getProducts` with mock data without having to run a real backend or intercept network requests.

---

## 💡 Bonus Challenge Viva Preparation: Sorting by Price

### How does sorting work on the backend and frontend?
- **Backend Query Builder**:
  ```javascript
  let sortOptions = { createdAt: -1 }; // default newest
  if (sort === 'price_asc') sortOptions = { price: 1 };
  if (sort === 'price_desc') sortOptions = { price: -1 };

  const products = await Product.find(filter).sort(sortOptions);
  ```
- **MongoDB Index Benefit**: Creating an index on `{ price: 1 }` allows MongoDB to return sorted records directly from the index tree without performing an expensive in-memory sort (`O(N log N)`).

---
---

# ❤️ ShopKart — Fullstack Engineering Lab 04: TA Viva Preparation Guide
## Wishlist (MongoDB Relationships + Protected APIs)

Answers to all 12 TA Viva Questions for **Engineering Lab 04**, based on the actual ShopKart code. File paths point to where each idea lives so you can open the file during the viva.

---

## Quick Reference Table

| Question # | Topic | Key Concepts |
|:---:|:---|:---|
| **Q1** | ObjectIds vs Product objects | Single Source of Truth, No Stale Copies, Smaller Documents |
| **Q2** | `ref: "Product"` | Tells Mongoose which model an ObjectId points to, enables `populate()` |
| **Q3** | Embedding vs Referencing | Data owned by one parent vs data shared across many documents |
| **Q4** | `populate()` | Swaps stored IDs for real Product documents in one call |
| **Q5** | Protected endpoints | A wishlist is personal data, `401 Unauthorized` without a valid JWT |
| **Q6** | User ID from the JWT | Signed by the server, cannot be forged |
| **Q7** | No `userId` from the client | Prevents reading or editing someone else's wishlist (IDOR) |
| **Q8** | Duplicate prevention | One atomic `findOneAndUpdate` with `$ne` + `$push` |
| **Q9** | Duplicate status code | `409 Conflict` |
| **Q10** | Fetching from the backend | Wishlist lives in MongoDB, never hardcoded in React |
| **Q11** | Loading / Error / Empty states | Every request has 3 outcomes, a blank screen communicates nothing |
| **Q12** | Surviving a refresh | React state dies on refresh, MongoDB does not |

---

## 🗺️ The Whole Feature in 30 Seconds

```text
React (ProductCard → WishlistButton)
   │  PATCH /wishlist/:productId/toggle      (HttpOnly cookie sent automatically)
   ▼
Express  →  authMiddleware  →  wishlist.controller.js
   │          │ verifies JWT, loads Customer, sets req.user
   │          ▼
   │        uses req.user._id (NEVER a userId from the client)
   ▼
MongoDB:  customers.wishlist = [ ObjectId("..."), ObjectId("...") ]
                                      │ ref: "Product"
                                      ▼
          products collection  (source of truth for price, stock, image)
```

| Method | Endpoint | Success | Failures |
|---|---|:---:|---|
| GET | `/wishlist` | 200 | 401 |
| POST | `/wishlist/:productId` | 201 | 401, 400 invalid ID, 404 product not found, 409 already saved |
| DELETE | `/wishlist/:productId` | 200 | 401, 400 invalid ID, 404 not in wishlist |
| PATCH | `/wishlist/:productId/toggle` *(bonus)* | 200 | 401, 400, 404 product not found |

> **Note:** ShopKart's user model is called **`Customer`** (built in Lab 01). The lab sheet says "User". They are the same thing here. We extended `Customer` rather than renaming it so Labs 01–03 keep working.

---

## 1. Why are we storing ObjectIds instead of Product objects?

### Core Answer:
The **Product collection is the single source of truth**. The wishlist only stores *which* products were saved, never *what they look like*.

```js
// ✅ What we store (backend/models/customer.model.js)
wishlist: [ ObjectId("66d123..."), ObjectId("66d456...") ]

// ❌ What we do NOT store
wishlist: [ { name: "Mechanical Keyboard", price: 2999, stock: 10 } ]
```

1. **No stale data**: If the price drops from ₹2,999 to ₹1,999, or stock goes to 0, every wishlist shows the new value instantly. With copies, each customer's wishlist would keep showing the old price until every copy was found and updated.
2. **One place to update**: Admins edit one Product document. With copies, a single price change would mean updating thousands of customer documents.
3. **Smaller documents**: An ObjectId is 12 bytes. A full product copy (description, image URL, and so on) is hundreds of bytes, multiplied by every saved item for every customer.
4. **Deleted products disappear cleanly**: When a product is removed from the catalog, `populate()` simply finds nothing for that ID, so it is never shown with outdated details.

> 🧪 **Proved by test:** `should reflect the latest product data (Product is the source of truth)` in `backend/tests/wishlist.test.js` saves a product, changes its price and stock, and checks that `GET /wishlist` returns the new values.

---

## 2. What does `ref: "Product"` do?

### Core Answer:
It tells Mongoose **which model the ObjectId belongs to**.

```js
wishlist: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  default: []
}
```

- On its own, an ObjectId is just a 12-byte value. MongoDB has no idea it means "a product".
- `ref: 'Product'` is the **map** that lets `populate('wishlist')` know to look these IDs up in the collection behind `mongoose.model('Product', ...)`, which is the `products` collection.
- **Without `ref`, `populate()` cannot work.** Mongoose would not know where to look.
- `ref` is **not** a database constraint like a SQL foreign key. MongoDB will not stop you storing an ID for a product that does not exist. That is why the **Add** API checks `Product.exists()` first and returns `404` if the product is missing.

`default: []` means new customers start with an empty wishlist, and older Lab 01 customers (saved before this field existed) still work.

---

## 3. What is the difference between embedding and referencing?

### Comparison Matrix:

| | Embedding | Referencing *(what we used)* |
|:---|:---|:---|
| **Storage** | Full sub-document copied inside the parent | Only the `_id` of the other document |
| **Example** | `wishlist: [{ name, price, ... }]` | `wishlist: [ObjectId]` + `ref: 'Product'` |
| **Read** | One query, data is already there | Needs `populate()` (one extra query) |
| **Update** | Must update every copy | Update once, everyone sees it |
| **Best for** | Data **owned by one parent** that rarely changes independently (e.g. a customer's saved addresses, an order's line items at checkout time) | Data **shared by many documents** that changes on its own (products, users) |

### Why referencing is right for a wishlist:
- A product is **shared**: the same Keyboard can be in thousands of wishlists.
- A product **changes independently**: price and stock change all the time.
- The wishlist only needs to say "I saved this product", not keep a snapshot of it.

> 💡 **Contrast for bonus points:** An **Order** is the opposite case. An order *should* embed the price at checkout time, because a receipt must not change when the product's price changes later. Same data, different requirement, different model.

---

## 4. Why do we use `populate()`?

### Core Answer:
The database stores IDs, but the UI needs names, prices and images. `populate()` **swaps each stored ObjectId for the real Product document** so the frontend gets everything in one response.

```js
// backend/controllers/wishlist.controller.js → getWishlist
const customer = await Customer.findById(req.user._id).populate({
  path: 'wishlist',
  select: 'name price category image stock'
});
```

**Before populate:**
```json
{ "wishlist": ["66d123...", "66d456..."] }
```
**After populate:**
```json
{ "wishlist": [ { "_id": "66d123...", "name": "Mechanical Keyboard", "price": 2999, ... } ] }
```

### What happens under the hood:
1. Query 1: find the customer, read the `wishlist` array of IDs.
2. Query 2: `Product.find({ _id: { $in: [ ...those IDs ] } })`, a single query for all products, not one query per product.
3. Mongoose places each product into the matching array slot.

### Why `select`?
`select: 'name price category image stock'` returns **only the fields the wishlist card displays**. That's less data over the network, and it avoids sending fields the page doesn't need.

### Bonus detail:
If a product was deleted from the catalog, `populate()` finds no document for its ID and **leaves it out of the result**. So the Wishlist page never renders a broken card. *(Test: `should skip products that were deleted from the catalog`.)*

---

## 5. Why should wishlist endpoints be protected?

### Core Answer:
A wishlist is **personal data that belongs to one logged-in customer**. Without authentication the server cannot know *whose* wishlist to read or change.

```js
// backend/routes/wishlist.routes.js
router.use(authMiddleware);   // one line protects ALL wishlist routes
```

1. **Identity**: The server needs to know who is asking. `authMiddleware` provides that as `req.user`.
2. **Privacy**: Saved items reveal shopping intent (gifts, health products and so on), which should not be public.
3. **Integrity**: Anonymous users must not be able to add or remove items from anyone's list.
4. **No forgotten routes**: Using `router.use()` instead of adding the middleware to each route means a new wishlist route cannot accidentally be left unprotected.

### What `authMiddleware` does (`backend/middlewares/auth.middleware.js`):
1. Reads the JWT from the **HttpOnly `token` cookie** (or the `Authorization: Bearer` header for Postman).
2. No token → **`401 Unauthorized`**.
3. `jwt.verify()` checks the signature and expiry. Invalid or expired → **`401`**.
4. Loads the customer from MongoDB. Deleted account → **`401`**.
5. Attaches the customer as `req.user` and calls `next()`.

> 🧪 **Proved by test:** `should return 401 without a token` and `should return 401 with an invalid token` hit all four endpoints.

---

## 6. Why should the server get the user ID from the JWT?

### Core Answer:
Because the JWT is **signed by the server with `JWT_SECRET`**, so it **cannot be forged or edited** by the client.

```text
Login  →  server signs { id: customer._id } with JWT_SECRET  →  HttpOnly cookie
Later  →  jwt.verify(token, JWT_SECRET)  →  trusted id  →  req.user
```

1. **Tamper-proof**: If someone changes the `id` inside the token, the signature no longer matches and `jwt.verify()` rejects it with `401`.
2. **Proven identity**: The ID in a valid token is the ID of whoever actually logged in with the right password.
3. **HttpOnly**: The token lives in an HttpOnly cookie, so page JavaScript (including XSS scripts) cannot read or steal it.

Every wishlist controller uses **only** `req.user._id`:
```js
Customer.findOneAndUpdate({ _id: req.user._id, ... }, ...)
```

---

## 7. Why should we not accept `userId` from the client?

### Core Answer:
Anything the client sends can be **changed by the client**. If the server trusted a `userId` from the request, any logged-in user could read or edit **anyone's** wishlist just by changing one value.

```http
❌ GET  /wishlist/66aaa...                 ← change the ID, read someone else's list
❌ POST /wishlist/66d123  { "userId": "66bbb..." }   ← add to someone else's list
```

This attack is called **IDOR (Insecure Direct Object Reference)** and is one of the most common real-world API vulnerabilities (OWASP API Security Top 10 #1: Broken Object Level Authorization).

### How ShopKart prevents it:
1. **No such route exists**: There is no `GET /wishlist/:userId`. `GET /wishlist` always means "*my* wishlist".
2. **The body is ignored**: The controllers never read `req.body.userId`.
3. **Identity comes only from the JWT** (see Q6).

> 🧪 **Proved by tests:**
> - `should ignore a userId sent in the request body`: John sends Jane's ID in the body, and the product goes into **John's** list. Jane's stays empty.
> - `should not expose a GET /wishlist/:userId route`: returns `404`.
> - `should only return the authenticated customer's wishlist`: two users never see each other's items.

---

## 8. How are duplicate wishlist entries prevented?

### Core Answer:
With **one atomic MongoDB operation** that adds the product **only if it is not already there**.

```js
// backend/controllers/wishlist.controller.js → addToWishlist
const updated = await Customer.findOneAndUpdate(
  { _id: req.user._id, wishlist: { $ne: productId } },  // match ONLY if not already saved
  { $push: { wishlist: productId } },                    // then add it
  { new: true, select: 'wishlist' }
);

if (!updated) {
  return res.status(409).json({ success: false, message: 'Product already in wishlist' });
}
```

- `wishlist: { $ne: productId }` means "the array does **n**ot **e**qual / contain this ID".
- If the product is already saved, the filter matches **no document**, nothing is pushed, `updated` is `null`, and we return **409**.

### Why not "find, check, then save"?
```js
// ❌ Race condition
const customer = await Customer.findById(id);
if (!customer.wishlist.includes(productId)) {   // two fast clicks BOTH pass this check...
  customer.wishlist.push(productId);
  await customer.save();                         // ...and BOTH save → duplicate!
}
```
Two requests arriving together can both read "not saved yet" before either writes. Our version does the **check and the write in a single database step**, so that gap doesn't exist.

> 🧪 **Proved by test:** `should not create duplicates when the same product is added concurrently` fires **3 requests at once**: exactly one gets `201`, two get `409`, and the array has exactly 1 entry.

### Second layer on the frontend:
`WishlistButton.jsx` **disables the button while a request is in flight** (`disabled={isSaving}`), so a double-click sends only one request. The backend protection is what *guarantees* it. The frontend one just avoids pointless requests.

### Bonus toggle uses `$addToSet`:
```js
{ $addToSet: { wishlist: productId } }   // adds only if not already in the array
```
`$addToSet` is MongoDB's built-in "add only if not already present" operator. We use `$ne` + `$push` for **Add** because Add must *tell* the client it was a duplicate (409). `$addToSet` silently does nothing on a duplicate, which suits toggle but not the 409 requirement.

---

## 9. What HTTP status should be returned for a duplicate wishlist request?

### Core Answer: **`409 Conflict`**

`409` means *"the request is valid, but it conflicts with the current state of the resource."* The product is already in the wishlist.

| Status | Why it is **not** right for a duplicate |
|:---:|:---|
| `200 OK` / `201 Created` | Says something was created, which is false and hides the conflict |
| `400 Bad Request` | Means the request is *malformed*, but the request is perfectly valid |
| `404 Not Found` | The product does exist |

### All Lab 04 status codes at a glance:

| Code | When |
|:---:|:---|
| **200** | GET wishlist, DELETE success, toggle success |
| **201** | POST added a new product (something was created) |
| **400** | `productId` is not a valid ObjectId format (`mongoose.Types.ObjectId.isValid()`) |
| **401** | Missing, invalid or expired JWT |
| **404** | Product does not exist (add/toggle) **or** product not in wishlist (remove) |
| **409** | Product already in wishlist |

> 💡 **Why check `400` before `404`?** `"abc"` is not even a *possible* ID (invalid input, so 400). A well-formed ID that matches no product is a valid request for something that doesn't exist (404). Checking the format first also avoids sending a bad ID to MongoDB, where it would throw a `CastError`.

---

## 10. Why should the Wishlist page fetch from the backend?

### Core Answer:
Because **the wishlist lives in MongoDB**, and the backend is the only place that knows the current truth.

```js
// frontend/src/pages/Wishlist.jsx
const data = await getWishlist();      // GET /wishlist
setItems(data.wishlist || []);
// ...
{items.map((product) => <WishlistCard key={product._id} product={product} ... />)}
```

1. **Per-user data**: Each customer has a different list. React cannot know it without asking the server.
2. **Always current**: Prices, stock and images come fresh from the Product collection via `populate()`.
3. **Works across devices**: Save on a phone, see it on a laptop. A hardcoded array or `localStorage` could never do that.
4. **The lab forbids hardcoding**: `const wishlist = [...]` in React would just be fake data.

### Why no Context / Redux here?
The lab deliberately comes **before** state management. The wishlist is **persistent backend data**, not UI state:
- `Products.jsx` and `Wishlist.jsx` each fetch what they need when they mount.
- **Navbar count (bonus):** every wishlist API response includes the server's `count`. `services/api.js` broadcasts that number with a browser event (`wishlist:changed`), and the Navbar listens for it. **The number always comes from the backend.** The event is a one-way notice, not a shared store that components read from or write to.

---

## 11. Why do we need loading, error and empty states?

### Core Answer:
Every network request has **at least three possible outcomes besides success**: it's still running, it failed, or it succeeded with nothing. If the UI only handles success, the other three show a **blank screen**, and the user can't tell whether to wait, retry or go shopping.

| State | What the user sees (`Wishlist.jsx`) | Why |
|:---|:---|:---|
| **Loading** | Spinner + "Loading your wishlist..." | Shows the app is working, not frozen |
| **Error** | "Something went wrong. We couldn't load your wishlist." + **Try Again** | Explains what happened and gives a way to recover. Try Again calls `loadWishlist()` again, a **new API request** |
| **Empty** | ❤️ "Your wishlist is empty" + **Browse Products** | Empty is a *valid* result (`200` with `[]`), so it gets a next step, not an error |
| **Success** | Grid of `WishlistCard`s + "2 products saved" | The data |

### The same idea at button level (`WishlistButton.jsx`):

```text
idle  ──click──▶  saving ("Saving...", button disabled)
                     ├── success ──▶ "♥ Added to Wishlist" (2s) ──▶ "♥ Remove from Wishlist"
                     └── failure ──▶ "Unable to save product. Please try again."
```
- **Disabled while saving** → no duplicate requests.
- **Never fails silently** → the error appears under the button, and the button returns to its previous state so the user can retry.

### Order of checks matters:
```jsx
{loading && <Loading />}
{!loading && error && <Error />}
{!loading && !error && items.length === 0 && <Empty />}
{!loading && !error && items.length > 0 && <Grid />}
```
Exactly **one** state renders at a time. You never see "empty" flash before the data arrives.

---

## 12. Why should the wishlist survive a page refresh?

### Core Answer:
Because **React state is temporary memory**. A refresh destroys the whole JavaScript app, and every `useState` resets. The wishlist is saved in **MongoDB**, which doesn't reset.

```text
User saves product ─▶ POST/PATCH ─▶ MongoDB customers.wishlist updated ✅
User presses F5    ─▶ React restarts, all state = []
Wishlist.jsx mounts ─▶ GET /wishlist ─▶ MongoDB returns the saved list ✅
```

1. **The product brief**: "Save the product, **come back later**." A wishlist that disappears on refresh fails the one job it has.
2. **Login session survives too**: The JWT is in an HttpOnly cookie (7-day expiry), so after a refresh `AuthContext` calls `GET /customers/me`, the user is still logged in, and `GET /wishlist` works.
3. **Survives logout and login**: The data belongs to the Customer document, not the browser session. *(Test: `should persist the wishlist across a fresh login`.)*
4. **Direct links work**: Refreshing on `/wishlist` serves the React app (the Vite proxy sends browser page loads to `index.html` and API calls to Express), and the page fetches fresh data.

---

## ⭐ Bonus 1 — Wishlist Toggle (`PATCH /wishlist/:productId/toggle`)

### How does it work?
```js
// 1. Already saved? → remove it
const removed = await Customer.findOneAndUpdate(
  { _id: req.user._id, wishlist: productId },
  { $pull: { wishlist: productId } },
  { new: true, select: 'wishlist' }
);
if (removed) return res.json({ success: true, saved: false, count: removed.wishlist.length });

// 2. Not saved → product must exist, then add it
if (!(await Product.exists({ _id: productId }))) return res.status(404)...;
const added = await Customer.findByIdAndUpdate(
  req.user._id, { $addToSet: { wishlist: productId } }, { new: true, select: 'wishlist' }
);
return res.json({ success: true, saved: true, count: added.wishlist.length });
```

### Why is toggle useful?
- **One button, one endpoint**: The frontend doesn't need to decide between POST and DELETE.
- **The server decides**: The response's `saved: true/false` is the truth, so the button can never get out of sync with the database even if the page's initial "saved" info was wrong.
- **Why `$pull` first?** If the product was deleted from the catalog, the customer can still remove its ID from their list.

---

## ⭐ Bonus 2 — Wishlist Count in the Navbar

### Where does the number come from?
**Always from the backend.** Every wishlist endpoint returns `count`:
```json
{ "success": true, "message": "Product added to wishlist", "count": 3 }
```

### How does the Navbar get it without Context/Redux?
```js
// services/api.js: after every wishlist response
window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { count } }));

// Navbar.jsx: listen, and fetch once on login
window.addEventListener('wishlist:changed', (e) => setWishlistCount(e.detail.count));
getWishlist();   // initial count
```
- Click ♡ on Products, the backend responds with `count: 3`, and the Navbar shows **3** instantly with no extra request.
- The Navbar **removes its listener** when it unmounts (cleanup in `useEffect`) to avoid memory leaks.
- On logout the count resets and the Wishlist link is hidden.

---

## 🎯 Tricky Follow-Up Questions (be ready!)

**Q: What happens if a saved product is deleted from the catalog?**
`GET /wishlist` skips it, because `populate()` finds nothing for that ID. The customer can still remove the leftover ID: `DELETE` and toggle do not require the product to exist.

**Q: Why does POST return `201` but DELETE returns `200`?**
`201 Created` means something new was added to the resource. DELETE removed something and returns a confirmation body, so `200 OK` is correct.

**Q: Why use `findOneAndUpdate` instead of `findById` + `save()`?**
It is **atomic**: the condition check and the update happen in one database operation, so concurrent requests can't both slip through (see Q8).

**Q: Where is the token? The frontend never sends an `Authorization` header.**
The JWT is in an **HttpOnly cookie**. Axios is configured with `withCredentials: true` (`services/api.js`), so the browser attaches the cookie automatically. Postman can use either the cookie or `Authorization: Bearer <token>`. The middleware accepts both.

**Q: What does a logged-out visitor see when they click ♡?**
They're sent to `/login` with the message "Log in to save products to your wishlist." After logging in they return to the page they came from (`location.state.from`). The backend would return `401` anyway, so the frontend redirect just gives a better experience.

**Q: How do product cards know which items are already saved?**
`Products.jsx` calls `GET /wishlist` once when the customer is logged in, builds a `Set` of saved product IDs, and passes `isSaved={savedIds.has(product._id)}` to each `ProductCard`. When a card toggles, it reports back through `onWishlistChange`, so the Set stays correct when filters re-render the grid.

**Q: How did you test the backend before connecting React?**
`backend/tests/wishlist.test.js` contains **27 Jest + Supertest tests** against an in-memory MongoDB, covering every row of the lab's edge-case table: add, duplicate (`409`), concurrent duplicates, invalid ID (`400`), missing product (`404`), get with populate, cross-user isolation, remove, not-in-wishlist (`404`), toggle, and `401` on every endpoint. Run them with `npm test` (56/56 passing including Labs 01–03).
