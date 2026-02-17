
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
| `is_active` | `tinyint(1)` | YES | | 0 | Default to hidden |
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
| `order_number` | `varchar(20)` | NO | UNI | NULL | |
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
| `status` | `enum('new','processing','shipped','completed','cancelled')` | YES | | 'new' | |
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
*   [x] **Image Handling:** Backend resolver for absolute paths implemented.
*   [ ] **Admin:** Currently mock-only. Needs real auth and DB write endpoints.

### Recent Changelog
*   **Updated Docs:** Refreshed DB Schema section with exact SQL structure.
*   **Fixed HTTP Tunnel:** Moved `DB_TUNNEL_SECRET` from Request Headers to Request Body.
*   **Image Serving:** Updated `server.js` to normalize absolute DB paths (e.g., `/home/smartmet/...`) to web URLs (`/product-images/...`) dynamically in the API response.
*   **Frontend Cleanup:** Removed `picsum` fallback from React components to rely solely on the server-resolved images.
*   **Email Templates:** Adjusted email max-width to 800px, added fallback text for empty notes, and fixed conditional rendering for discount lines (only displayed if value > 0). **Status: Functional**.
*   **UI Adjustments (Contact):** Removed the support phone number display card from the Contact page as requested (input field preserved). **Status: Functional**.
*   **UI Adjustments (Header):** Converted the top-left email address into a clickable `mailto:` link. **Status: Functional**.
*   **Product Availability:** Added `is_active` flag (defaults to false) and `out_of_stock` status. Updated UI to hide price and show unavailable status when applicable. **Status: Functional**.

---
*End of Specification.*
