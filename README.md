# HerStep Collection

Secure, mobile-first e-commerce platform for HerStep Collection, built with static HTML/CSS/JavaScript, Firebase, and Vercel serverless functions.

## Phase 1 status

This delivery establishes the platform foundation: a premium responsive entry page, Firebase email/password account flow, secure server-side profile provisioning, Firestore rules/indexes, and deployment/environment configuration. Product, checkout, payment, and support features intentionally remain unimplemented until their respective phases; the UI does not claim those integrations exist.

## Architecture and data model

- `index.html`, `styles.css`, and `app.js`: dependency-light customer shell and modular authentication bootstrap.
- `api/firebase-config.js`: exposes only Firebase's public Web configuration at runtime.
- `api/auth/sync-profile.js`: verifies the Firebase ID token with Firebase Admin and creates the customer profile server-side. It always assigns the `CUSTOMER` role; a browser cannot create an admin profile.
- `api/_lib/firebase-admin.js`: shared trusted-server initialization and bearer-token verification.
- `firestore.rules`: deny-by-default Firestore authorization. Orders, payments, inventory, audit records, and support mutations are reserved for forthcoming verified API functions.

Planned top-level Firestore collections are: `users`, `products`, `categories`, `orders`, `orderItems`, `payments`, `paymentTransactions`, `orderStatusHistory`, `supportTickets`, `supportMessages`, `discountRequests`, `bulkOrderRequests`, `productRequests`, `promotions`, `promoCodes`, `notifications`, `adminUsers`, `auditLogs`, `inventoryLogs`, and `settings`.

## Security model

- Firebase Authentication establishes customer identity.
- Firebase Admin verifies tokens for all sensitive Vercel API operations.
- Firestore rules isolate customer records by `customerId`, reserve staff access for `ADMIN`/`SUPER_ADMIN`, and forbid direct financial/order/inventory writes.
- Upcoming order creation will use a server-side Firestore transaction to reprice items, validate promotions and size stock, and reserve inventory atomically.
- The later M-Pesa callback will be verified server-side and idempotent. Browser payment state will never be treated as payment confirmation.

## Integration contract and required configuration

Copy `.env.example` into the Vercel project settings and supply the Firebase Web config and Firebase Admin service-account fields. `FIREBASE_ADMIN_PRIVATE_KEY` must preserve newlines (the server supports escaped `\\n`). Cloudinary and M-Pesa variables are placeholders for later phases only; no upload or payment endpoint exists yet.

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
