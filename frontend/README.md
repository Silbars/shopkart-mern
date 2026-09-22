# ShopKart Frontend — Login → Home Flow (Lab 02)

Welcome to the frontend application for **ShopKart**, completing **Engineering Lab 02 (100 Marks)**.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with `withCredentials: true`
- **Styling**: Vanilla CSS Design System with CSS Custom Properties & Micro-animations
- **Icons**: Lucide React
- **Architecture**: Context API (`AuthContext`), Protected Routes (`ProtectedRoute`), Modular Services (`api.js`)

---

## 📁 Folder Structure

```
frontend/
│
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Brand header with customer info & logout button
│   │   └── ProtectedRoute.jsx  # Route guard checking GET /customers/me
│   │
│   ├── context/
│   │   └── AuthContext.jsx     # Session state & HttpOnly cookie validation
│   │
│   ├── pages/
│   │   ├── Register.jsx        # Task 1: Controlled inputs, client validation & API
│   │   ├── Login.jsx           # Task 2: Credentials with HttpOnly cookie & redirect
│   │   └── Home.jsx            # Task 3: Protected customer profile dashboard
│   │
│   ├── services/
│   │   └── api.js              # Axios instance configured with withCredentials: true
│   │
│   ├── App.jsx                 # App routing & navigation structure
│   ├── main.jsx                # Entrypoint mounting AuthProvider & BrowserRouter
│   └── index.css               # Design system tokens, glassmorphism, responsive UI
│
├── index.html                  # HTML5 shell with Google Fonts & SEO meta tags
├── vite.config.js              # Vite server & backend reverse proxy configuration
├── VIVA_PREP.md                # In-depth answers to all 5 TA Viva Questions
└── package.json                # Dependencies & build scripts
```

---

## 🚀 Running the Application

### 1. Start Both Backend & Frontend Concurrently (from root)

```bash
npm run dev
```

### 2. Or Start Individually

**Terminal 1 (Backend - Port 5001):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend - Port 5173):**
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Tasks & Evaluation Rubric (100 Marks)

| Task | Marks | Description | Implementation |
| :--- | :--- | :--- | :--- |
| **Task 1: Register Page** | 25 | Controlled form, validation, `POST /customers/register`, redirect to `/login` | `src/pages/Register.jsx` |
| **Task 2: Login Page** | 25 | Credentials with cookie, error banners, `POST /customers/login`, navigate to `/home` | `src/pages/Login.jsx` |
| **Task 3: Protected Home** | 20 | Fetch `GET /customers/me`, display user details, redirect to `/login` if unauthenticated | `src/pages/Home.jsx`, `src/components/ProtectedRoute.jsx` |
| **Task 4: Logout** | 10 | Navbar logout button, clear cookie via `POST /customers/logout`, redirect to `/login` | `src/components/Navbar.jsx` |
| **Routing** | 10 | React Router DOM configuration, protected route wrapper, 404 fallback | `src/App.jsx` |
| **UI & Code Quality** | 10 | Responsive glassmorphic layout, clean component architecture, accessible forms | `src/index.css` |
| **Total** | **100** | | |

---

## 📖 Viva Preparation

Read [VIVA_PREP.md](./VIVA_PREP.md) for full answers to all 5 evaluation questions.
