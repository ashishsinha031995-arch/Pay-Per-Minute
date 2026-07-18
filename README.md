# CallMint - Full-Stack Digital Consultation Platform

Welcome to **CallMint**, a highly responsive, real-time digital consultation and expert engagement platform. This repository is built as a full-stack application connecting clients (Users) with professional consultants (Experts) for real-time chat sessions, wallet-based billing, queue management, and support ticketing.

This document serves as an architectural blueprint and technical audit of the codebase, designed to help any developer understand the project’s design, tech stack paradoxes, data flows, and identified security/concurrency vulnerabilities.

---

## 🗺️ Project Architecture & Tech Stack

CallMint is structured as a full-stack project with decoupled client and server layers.

```
.
├── backend/                 # Node.js + Express + TypeScript Backend
│   ├── server.ts            # Entry point for development and custom builds
│   └── src/
│       ├── app.ts           # Express Application configuration and middlewares
│       ├── config/          # DB connections (SQLite, MongoDB), Socket settings
│       ├── controllers/     # Route logic (Auth, Payments, Admin, User, Support)
│       ├── helpers/         # Email helpers and background utils
│       ├── jobs/            # Cron jobs (Chat session expiration tracker)
│       ├── routes/          # Express API endpoints
│       ├── services/        # Business logic layers (Chat, Wallet, Timer)
│       └── sockets/         # WebSocket events & Socket.io managers
│
└── frontend/                # Vite + React + Tailwind CSS Frontend
    ├── public/              # Static assets, Web Manifest, Service Worker
    └── src/
        ├── app/             # Main application views and dynamic layouts
        │   └── page.tsx     # Monolithic main controller & state orchestrator (1700+ lines)
        ├── components/      # Extracted UI blocks and visual panels
        │   └── layouts/     # Dense layout containers (e.g. ConsultantProfile.tsx - 4400+ lines)
        └── middleware/      # Auth & Role-based routing guards on client state
```

### ⚙️ Technologies Used:
- **Frontend**: React 18, Vite (Dev & Bundling), Tailwind CSS (Utility styling), Framer Motion (Transitions), Lucide React (Icons).
- **Backend**: Node.js, Express (API Gateway), TypeScript (`tsx` for dev runtime), Socket.io (Real-time duplex communication).
- **Primary Database**: `better-sqlite3` (SQLite) – chosen for synchronized, ultra-fast low-latency ACID database operations on disk.
- **Secondary Mirror Database**: MongoDB (via `mongoose`) – serves as an asynchronous read/write mirror for durable cloud backups and document scalability.

---

## 🧩 Tech Stack Paradox: Why is it structured this way?

Any developer looking at the frontend folder structure might experience confusion at first glance. Here is why the files are structured the way they are:

### 1. Vite React SPA masquerading as Next.js App Router
- **The Paradox**: There is a `/frontend/src/app` folder containing directories like `/chat`, `/dashboard`, `/login`, `/register`, etc., each with its own `page.tsx` file. This looks exactly like a Next.js App Router project.
- **The Reality**: The application is actually a **Vite client-side Single Page Application (SPA)**. It is built and bundled using Vite, not Next.js.
- **The Ghost Foldes**: The folders inside `/src/app` (except for `page.tsx`) are **ghost folders** and do not serve actual routing functions. The entire application state, page routing, and view toggling is orchestrated dynamically inside a single monolithic file: `/frontend/src/app/page.tsx` using local state variables (e.g., `activeView`, `activeSession`).
- **Why?**: The code structure was designed to mimic the modern aesthetic folder structure of Next.js, but is fully run by a client-side Vite dev server for instant hot-reload and iframe compatibility.

### 2. Frontend "Middlewares"
- **The Paradox**: There is a `/frontend/src/middleware` folder with `auth.ts` and `role.ts`.
- **The Reality**: In a standard React application, middleware is a backend concept. Here, these files act as client-side authorization and role-based guards. They intercept local state transitions to prevent regular clients from accessing the Admin panel, or unauthorized guests from reaching the Consultant dashboard.

### 3. Monolithic View Components
- **The Monoliths**: `/frontend/src/app/page.tsx` (1700+ lines) and `/frontend/src/components/layouts/ConsultantProfile.tsx` (4400+ lines) contain dense UI elements, styling definitions, state management, and real-time backend API requests mixed together.
- **Reason for size**: High density of interactive features – everything from wallet recharge, rating cards, past session histories, chat package selections, call pricing, scheduling slots, and verification KYC forms are packaged into single-view components to simplify component state-sharing without complex Redux boilers or Context boilerplate.

---

## 🔒 Security, Concurrency, and Logical Bug Audit (Backend)

During our architectural review, we identified several critical bugs and security vulnerability gaps that require resolution before deploying to a multi-instance production environment.

### 1. Payment & Wallet Atomicity / Race Conditions (Critical)
- **Vulnerability**: Wallet balance updates are written via SQL queries like:
  `UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?`.
  If multiple server instances are running or parallel requests are sent simultaneously, **Race Conditions** can occur.
- **Exploitation Scenario**: A user with ₹50 remaining starts three parallel consult sessions simultaneously across different tabs. The server checks the balance in parallel, sees ₹50 is sufficient for all three individually, allows the sessions to initiate, and debits the wallet three times, resulting in a negative balance or uncollected revenue.
- **Solution**: Implement database-level transactions with strict lock isolations, or a distributed lock mechanism (like Redlock via Redis) to process wallet updates atomically.

### 2. Socket Connection & Chat Room Authorization Leak (High)
- **Vulnerability**: When client sockets connect to the server, they register room events simply by sending their `session_id` or `user_id`. There is no verification of cryptographic authentication tokens (like JWT) in the WebSocket handshake.
- **Exploitation Scenario**: An attacker who obtains or guesses a valid 10-character alphanumeric `session_id` can connect directly to the WebSocket server, join that room, and intercept live chats, send messages, or trigger premature session expirations on behalf of legitimate users.
- **Solution**: Implement token verification (JWT validation or session cookie authorization) during the Socket.io connection handshake (`io.use(...)`).

### 3. Asynchronous SQLite-MongoDB Sync Drift (Medium)
- **Vulnerability**: To protect the fast performance of the local SQLite instance, the dual-database replication mechanism to MongoDB is executed asynchronously *after* the SQLite operations complete.
- **Exploitation Scenario**: If the Node.js process crashes, encounters an unhandled exception, or loses network connectivity immediately after updating SQLite but before completing the `Mongoose` write, the databases will drift out of sync.
- **Solution**: Introduce an transactional event outbox pattern or a reliable background synchronization queue (e.g. BullMQ) to ensure guaranteed sync delivery.

### 4. Raw Input & Lack of Schema Validation (Medium)
- **Vulnerability**: Express route handlers accept parameters from `req.body` and insert them directly into queries or format them into chat transcripts without strict type-schema validations.
- **Exploitation Scenario**: An attacker could send deeply nested payloads or script tags in user messages that get appended directly to the `transcript` text database column, opening doors to Cross-Site Scripting (XSS) when administrators or users view past records.
- **Solution**: Enforce strict schema validation on all API endpoints using validation libraries like **Zod** or **Joi**.

### 5. Part-Finished Registration Actions / Ghost Users (Medium)
- **Vulnerability**: During registration, if database user creation succeeds but the background credential email system fails or loses internet connection, the endpoint throws an unhandled error, leaving a "Ghost User" created in the database but unconfirmed by the auth system.
- **Solution**: Wrap user creation and side-effect actions in database transaction rollbacks, or process side-effects (like emailing) asynchronously via background workers.

---

## 🛠️ Development & Deployment Instructions

### 1. Installation
Install all base dependencies from the root directory:
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example` in both root and backend environments:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/callmint
JWT_SECRET=your_jwt_secret_here
```

### 3. Execution Commands
- **Start Development Server**: Runs full-stack environment.
  ```bash
  npm run dev
  ```
- **Build Production Assets**: Compiles the frontend assets to static distribution and compiles the backend TS server into a single bundled file using esbuild.
  ```bash
  npm run build
  ```
- **Start Compiled Standalone Production Server**:
  ```bash
  npm run start
  ```

---

## 🗺️ Recommended Code Clean-Up & Refactoring Roadmap

To transition this codebase from a single-screen monolithic archetype to a clean, scale-ready production architecture, we recommend the following step-by-step roadmap:

### Phase 1: Frontend Modularity
1. **Remove Ghost Files**: Safely delete the empty subfolders inside `/frontend/src/app` (e.g., `/login`, `/register`, `/settings`) to eliminate developer confusion.
2. **Deconstruct Monoliths**: Divide `/frontend/src/components/layouts/ConsultantProfile.tsx` into smaller, independent subcomponents:
   - `ProfileHeader.tsx`
   - `RatingList.tsx`
   - `PackageBilling.tsx`
   - `ScheduleCalendar.tsx`
3. **State Management**: Implement a React Context Provider (`ConsultantProfileContext.tsx`) to manage the state of active packages and user selections, eliminating deep prop drilling.

### Phase 2: Backend Hardening
1. **Socket Handshake Auth**: Introduce a JWT validation middleware to Socket.io to block unauthenticated room joins.
2. **Wallet ACID Constraints**: Implement atomic `CHECK` constraints on SQLite's `users.wallet_balance` so it can never drop below zero at the DB engine level.
3. **Outbox Pattern for Mongo Sync**: Replace instant inline MongoDB syncing with a background queue that processes records sequentially.
