# HerStep Collection

Secure, mobile-first e-commerce platform for HerStep Collection, built with static HTML/CSS/JavaScript, Firebase, and Vercel serverless functions.

## Delivery status

This delivery establishes the platform foundation through Phase 4: a premium responsive entry page, Firebase email/password account flow, secure server-side profile provisioning, product catalogue, local cart, authenticated checkout, server-authoritative order creation, and provider-independent payment records, callbacks, receipts, and customer payment UI. Support remains unimplemented.

## Architecture and data model

- `index.html`, `styles.css`, and `app.js`: dependency-light customer shell and modular authentication bootstrap.
- `api/firebase-config.js`: exposes only Firebase's public Web configuration at runtime.
- `api/auth/sync-profile.js`: verifies the Firebase ID token with Firebase Admin and creates the customer profile server-side. It always assigns the `CUSTOMER` role; a browser cannot create an admin profile.
- `api/_lib/firebase-admin.js`: shared trusted-server initialization and bearer-token verification.
- `firestore.rules`: deny-by-default Firestore authorization. Orders, payments, inventory, audit records, and support mutations are reserved for forthcoming verified API functions.
- `api/products/*` and `api/categories/*`: public read APIs plus admin-token-gated authoring endpoints. Product validation maintains size-specific inventory as the only stock source.
- `api/media/sign-upload.js`: short-lived, authenticated Cloudinary upload-signature contract for approved product image/video formats and size limits. Cloudinary private credentials never enter browser code.

Product documents use `inventory: [{ size, quantity }]` as their authoritative per-size stock representation. `stockQuantity` and `availableSizes` are derived and written only by the API to support fast catalogue reads. Product update operations create an `inventoryLogs` record when quantities change; a later order API will use Firestore transactions to reserve stock and prevent overselling.

`POST /api/orders/create` accepts only product IDs, sizes, quantities, and delivery fields. It ignores browser prices, discounts, delivery fees, totals, and stock. In one Firestore transaction it reloads active products, validates stock, captures immutable line-item prices, reserves each selected size, increments a yearly counter, creates a human-readable `HS-YYYY-000001` order ID, and records initial status history. Checkout reads delivery configuration from the server-managed `settings/checkout` document, which must contain non-negative integer `deliveryFee`, `collectionEnabled: true`, and (if offered) `deliveryEnabled: true`.

Planned top-level Firestore collections are: `users`, `products`, `categories`, `orders`, `orderItems`, `payments`, `paymentTransactions`, `orderStatusHistory`, `supportTickets`, `supportMessages`, `discountRequests`, `bulkOrderRequests`, `productRequests`, `promotions`, `promoCodes`, `notifications`, `adminUsers`, `auditLogs`, `inventoryLogs`, and `settings`.

## Security model

- Firebase Authentication establishes customer identity.
- Firebase Admin verifies tokens for all sensitive Vercel API operations.
- Firestore rules isolate customer records by `customerId`, reserve staff access for `ADMIN`/`SUPER_ADMIN`, and forbid direct financial/order/inventory writes.
- Upcoming order creation will use a server-side Firestore transaction to reprice items, validate promotions and size stock, and reserve inventory atomically.
- The later M-Pesa callback will be verified server-side and idempotent. Browser payment state will never be treated as payment confirmation.

## Payment integration boundary

Phase 4 intentionally does **not** invent an M-Pesa provider request, authentication method, callback payload, success code, or webhook signature. `api/_lib/mpesa-provider.js` is the only provider boundary and fails closed until the selected provider supplies its API and webhook documentation. A real adapter must expose `initiateStk({ paymentId, orderId, amount, phone, currency })` and `verifyCallback(request)`. The latter must authenticate the raw provider request and return normalized, verified fields only: `providerReference`, `status`, integer `amount`, optional `transactionReference`, optional `failureReason`, and optional unique `eventId`.

The server creates payments from trusted order totals, persists provider references, verifies callbacks before applying them, and processes callbacks in Firestore transactions. Browser code cannot supply payment status, amount, transaction references, receipt numbers, or provider data.

## Integration contract and required configuration

Copy `.env.example` into the Vercel project settings and supply the Firebase Web config and Firebase Admin service-account fields. `FIREBASE_ADMIN_PRIVATE_KEY` must preserve newlines (the server supports escaped `\\n`). The Cloudinary values enable the authenticated product-media signing endpoint. M-Pesa requires the provider-specific adapter/documentation described above plus the configured server-only credentials and webhook secret.

Deploy Firestore rules and indexes with the Firebase CLI after selecting the correct Firebase project:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Delivery plan

1. **Complete:** architecture, Firebase authentication, profile setup, Firestore structure/security.
2. Product catalogue, categories, size-aware inventory, Cloudinary signing.
3. Server-validated cart, checkout, atomic orders, order IDs.
4. M-Pesa STK initiation, signed webhook processing, payment records and receipts.
5. Tracking, status history, notifications.
6. Customer dashboard.
7. Real-time support tickets and chat.
8. Requests, promotions and server-validated promo codes.
9. Role-gated admin dashboard.
10. Analytics, audit coverage, SEO/performance, final security and mobile review.
