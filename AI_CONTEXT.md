# AI DEVELOPMENT CONTEXT & TECHNICAL SPECIFICATION - SmartMeter.ro

> **SYSTEM INSTRUCTION FOR AI AGENTS:**
> This document acts as the **Master Architectural Reference**.
> BEFORE writing code, read this to understand the custom Database Tunneling, the State Management strategy, and the API contract.
> **UPDATE** the "Changelog" section at the bottom after every successful task.

---

## 1. System Architecture Overview

**SmartMeter.ro** is a B2B e-commerce platform for industrial metering. It operates on a **Hybrid Architecture** designed to bypass shared hosting restrictions (port blocking).

### High-Level Stack
*   **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, React Router DOM (HashRouter).
*   **Backend:** Node.js (Express) acting as an API Gateway and Render Server.
*   **Database:** MySQL (Hosted on cPanel/Shared Hosting).
*   **Connectivity:** **HTTP Tunneling** via a custom PHP Bridge.
*   **Email:** SMTP via Nodemailer.

---

## 2. The Database Bridge (HTTP Tunneling) Protocol

**CRITICAL:** The Node.js server cannot connect to MySQL directly via port 3306 due to firewall rules.
**SOLUTION:** Node.js sends SQL queries as JSON payloads to a PHP script (`db_bridge.php`) hosted on the remote server via HTTPS.

### The Flow
1.  `server.js` creates a JSON payload: `{ sql: "SELECT...", params: [], secret: "..." }`.
2.  Request is sent via `fetch` (POST) to `https://smartmeter.ro/db_bridge.php`.
3.  `db_bridge.php` verifies the `secret` (from Body), executes SQL via PDO, and returns JSON.

### Security Protocol
*   **Secret Key:** Must be passed in the **JSON BODY** (`req.body.secret`), NOT in headers. (Reason: Shared hosting firewalls often strip custom headers like `X-Bridge-Secret`).
*   **Environment Variables:**
    *   Node (`.env`): `DB_TUNNEL_SECRET`
    *   PHP (`db_bridge.php`): `$SECRET_KEY`
    *   *These must match exactly.*

---

## 3. Database Schema (Inferred)

The application expects the following MySQL structure:

*   **`products`**
    *   `id` (INT, PK, AI)
    *   `sku` (VARCHAR)
    *   `name` (VARCHAR)
    *   `category` (VARCHAR) - *Enum: ELECTRIC, WATER, GAS, THERMAL*
    *   `manufacturer` (VARCHAR)
    *   `price` (DECIMAL)
    *   `currency` (VARCHAR)
    *   `stock_status` (VARCHAR)
    *   `image_url` (VARCHAR)
    *   `short_description` (JSON) - *{ro: string, en: string}*
    *   `full_description` (JSON)
    *   `specs` (JSON) - *Key-value pairs*
    *   `protocol` (VARCHAR/JSON)
    *   `datasheet_url` (VARCHAR)

*   **`orders`**
    *   `id` (INT, PK, AI)
    *   `order_number` (VARCHAR) - *e.g., ORD-2025-123456*
    *   `client_token` (VARCHAR) - *UUID stored in localStorage for guest history*
    *   `customer_email` (VARCHAR)
    *   `billing_details` (JSON)
    *   `shipping_details` (JSON)
    *   `subtotal` (DECIMAL)
    *   `discount_amount` (DECIMAL)
    *   `final_total` (DECIMAL)
    *   `status` (VARCHAR) - *new, processing, completed*
    *   `created_at` (DATETIME)

*   **`order_items`**
    *   `id` (INT, PK, AI)
    *   `order_id` (INT, FK)
    *   `product_id` (INT)
    *   `sku` (VARCHAR)
    *   `quantity` (INT)
    *   `unit_price` (DECIMAL)
    *   `total_price` (DECIMAL)

*   **`discounts`**
    *   `code` (VARCHAR)
    *   `type` (VARCHAR) - *percent, fixed*
    *   `value` (DECIMAL)
    *   `is_active` (BOOLEAN)

---

## 4. Frontend Application Structure

### State Management (Context API)
1.  **`CartContext.tsx`**: Manages cart items, quantity logic, subtotal/total calculations, and discount code validation (calls `/api/validate-discount`). Persists to `localStorage`.
2.  **`ProductContext.tsx`**: Fetches products from `/api/products` with query params for filtering. Handles loading/error states.
3.  **`LanguageContext.tsx`**: Simple `ro/en` toggle. Translations stored in `constants.ts`.

### Key Pages
*   **Shop (`/shop`):** Lists products. Uses `URLSearchParams` for filters (Category, Manufacturer, Protocol).
*   **Checkout (`/checkout`):** Collects Billing/Shipping info. Submits payload to `/api/orders`. Generates `sm_client_token` if missing.
*   **My Orders (`/my-orders`):** Fetches order history using the browser's `sm_client_token`.
*   **Admin (`/admin`):** Client-side mock dashboard (currently). Needs backend auth implementation.

---

## 5. API Endpoints (`server.js`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Accepts `category`, `manufacturer`, `protocol`, `search`. Returns JSON array. |
| `GET` | `/api/products/:id` | Returns single product details. |
| `GET` | `/api/validate-discount` | Accepts `code`. Returns discount details or 404. |
| `GET` | `/api/my-orders` | Accepts `token`. Returns orders for that client token. |
| `POST` | `/api/orders` | Creates Order & OrderItems in DB (Transaction). Sends Email. |
| `POST` | `/api/contact` | Sends contact form email via SMTP. |

---

## 6. Implementation Status & Changelog

### Status
*   [x] **Infrastructure:** Node.js + PHP Bridge (Tunnel) operational.
*   [x] **Database:** Connection established securely (Secret in Body).
*   [x] **Frontend:** React structure complete, Responsive UI.
*   [x] **Core Features:** Filtering, Cart, Checkout, Email Notifications.
*   [ ] **Admin:** Currently mock-only. Needs real auth and DB write endpoints.

### Recent Changelog
*   **Fixed HTTP Tunnel:** Moved `DB_TUNNEL_SECRET` from Request Headers to Request Body to bypass cPanel firewall stripping.
*   **Created Context File:** Added `AI_CONTEXT.md` for agent continuity.
*   **Updated `server.js`:** Implemented tunnel logic specifically for transactions (Mock Transaction for tunnel mode).

---
*End of Specification.*
