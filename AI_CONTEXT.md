
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

### 2.1 Image Serving Strategy (Path Resolution)
The system handles a discrepancy between physical file paths and web URLs:
1.  **Storage:** Images are stored on the server at absolute paths (e.g., `/home/smartmet/images/SmartMeters/Products/SKU-123`).
2.  **Database:** The `image_url` column in the DB stores this **absolute path**.
3.  **API Normalization:** When `server.js` serves product data (`/api/products`), it detects absolute paths and converts them to web-accessible URLs (e.g., `/product-images/SKU-123`).
4.  **Middleware:** A specific route handler in `server.js` listens to `/product-images/:sku`, locates the physical file (checking extensions `.jpg`, `.png`, etc.), and streams it to the browser.

---

## 3. Database Schema (Actual)

Based on `DESCRIBE` output from the live database.

### Table: `products`
| Field | Type | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | PRI | NULL | auto_increment |
| `sku` | `varchar(50)` | NO | UNI | NULL | |
| `name` | `varchar(255)` | NO | | NULL | |
| `category` | `enum('ELECTRIC','WATER','GAS','THERMAL')` | NO | MUL | NULL | |
| `manufacturer` | `varchar(100)` | NO | MUL | NULL | |
| `series` | `varchar(100)` | YES | | NULL | |
| `mounting` | `varchar(100)` | YES | | NULL | |
| `protocol` | `varchar(100)` | YES | MUL | NULL | |
| `max_capacity` | `decimal(10,2)` | YES | | NULL | |
| `price` | `decimal(10,2)` | NO | | NULL | |
| `currency` | `varchar(10)` | YES | | 'RON' | |
| `stock_status` | `enum('in_stock','on_request','out_of_stock')` | YES | | 'in_stock' | |
| `is_active` | `tinyint(1)` | NO | | 0 | 0=Hidden, 1=Visible |
| `image_url` | `varchar(500)` | YES | | NULL | |
| `short_description` | `json` | YES | | NULL | |
| `full_description` | `json` | YES | | NULL | |
| `specs` | `json` | YES | | NULL | |
| `datasheet_url` | `varchar(500)` | YES | | NULL | |
| `created_at` | `timestamp` | YES | | CURRENT_TIMESTAMP | |
| `updated_at` | `timestamp` | YES | | CURRENT_TIMESTAMP | on update |

### Table: `orders`
| Field | Type | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | PRI | NULL | auto_increment |
| `order_number` | `varchar(30)` | NO | UNI | NULL | |
| `client_token` | `varchar(64)` | YES | MUL | NULL | |
| `client_ip` | `varchar(45)` | YES | | NULL | |
| `customer_email` | `varchar(255)` | NO | | NULL | |
| `billing_details` | `json` | NO | | NULL | |
| `shipping_details` | `json` | NO | | NULL | |
| `order_notes` | `text` | YES | | NULL | |
| `subtotal` | `decimal(10,2)` | NO | | NULL | |
| `discount_code` | `varchar(50)` | YES | | NULL | |
| `discount_amount` | `decimal(10,2)` | YES | | 0.00 | |
| `final_total` | `decimal(10,2)` | NO | | NULL | |
| `status` | `enum('new','processing','in_delivery','complete','cancelled')` | YES | | 'new' | |
| `created_at` | `timestamp` | YES | | CURRENT_TIMESTAMP | |

### Table: `order_items`
| Field | Type | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | PRI | NULL | auto_increment |
| `order_id` | `int` | NO | MUL | NULL | |
| `product_id` | `int` | YES | | NULL | |
| `product_name` | `varchar(255)` | NO | | NULL | |
| `sku` | `varchar(50)` | NO | | NULL | |
| `quantity` | `int` | NO | | NULL | |
| `unit_price` | `decimal(10,2)` | NO | | NULL | |
| `total_price` | `decimal(10,2)` | NO | | NULL | |

### Table: `discounts`
| Field | Type | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int` | NO | PRI | NULL | auto_increment |
| `code` | `varchar(50)` | NO | UNI | NULL | |
| `type` | `enum('percent','fixed')` | NO | | NULL | |
| `value` | `decimal(10,2)` | NO | | NULL | |
| `is_active` | `tinyint(1)` | YES | | 1 | |

---

## 4. Frontend Application Structure

### State Management (Context API)
1.  **`CartContext.tsx`**: Manages cart items, quantity logic, subtotal/total calculations, and discount code validation (calls `/api/validate-discount`). Persists to `localStorage`.
2.  **`ProductContext.tsx`**: Fetches products from `/api/products` with query params for filtering. Handles loading/error states.
3.  **`LanguageContext.tsx`**: Simple `ro/en` toggle. Translations stored in `constants.ts`.

### Key Pages
*   **Shop (`/shop`):** Lists products. Uses `URLSearchParams` for filters (Category, Manufacturer, Protocol, Stock Status).
*   **Checkout (`/checkout`):** Collects Billing/Shipping info. Submits payload to `/api/orders`. Generates `sm_client_token` if missing.
*   **My Orders (`/my-orders`):** Optimized for performance.
    1.  **Initial Load:** Fetches a list of order summaries from `/api/order-history` based on the client's token OR IP address. This list is cached in `localStorage`. Previously opened order details are preserved from the cache.
    2.  **Details View:** When an order is expanded, full details (items, status) are fetched on-demand from `/api/order-details/:id` and then saved to the cache.
    3.  **Refresh:** A refresh button with a configurable, persistent cooldown allows re-fetching details and updating the cache.
*   **Admin (`/admin`):** Admin route and component exist but are currently hidden from the UI.

---

## 5. API Endpoints (`server.js`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Accepts `category`, `manufacturer`, `protocol`, `search`, `include_inactive`, `stock_status`. |
| `GET` | `/api/products/:id` | Returns single product details. |
| `GET` | `/api/validate-discount` | Accepts `code`. Returns discount details or 404. |
| `GET` | `/api/order-history` | Accepts `token`. Returns order summaries matching token OR request IP. |
| `GET` | `/api/order-details/:order_number` | Returns full details for a single order. |
| `POST` | `/api/orders` | Creates Order & OrderItems in DB (Transaction). Sends Email. |
| `POST` | `/api/contact` | Sends contact form email via SMTP. |

---

## 6. Implementation Status & Changelog

### Status
*   [x] **Infrastructure:** Node.js + PHP Bridge (Tunnel) operational.
*   [x] **Database:** Connection established securely.
*   [x] **Frontend:** React structure complete, Responsive UI.
*   [x] **Core Features:** Filtering, Cart, Checkout, Email Notifications.
*   [x] **Image Handling:** Backend resolver for absolute paths implemented.
*   [ ] **Admin:** Currently hidden. Needs real auth and DB write endpoints.

### Recent Changelog
*   **MyOrders Page Optimization:** Refactored the MyOrders page for performance. It now fetches a list of order summaries by token OR IP on initial load, caching the result. Full order details are fetched on-demand when an order is expanded and are also cached. A refresh button with a persistent cooldown allows updating cached details.
*   **Order ID Generation:** Implemented a robust order numbering system (`ORD-YYYY-ID`) using the database auto-increment ID to guarantee uniqueness.
*   **Order Statuses:** Aligned email status with DB. Updated DB schema to support `new`, `processing`, `in_delivery`, `complete`, `cancelled`. Added translations.
*   **Email Template:** Increased font size and container width for better readability.
*   **Shop Filters:** Added an "Availability" filter for `in_stock` and `on_request`.
*   **Internationalization (i18n):** Performed a full-app scan and moved hardcoded strings to the translation system.
*   **Admin Page:** Hid the admin page link and route as requested.

---
*End of Specification.*
