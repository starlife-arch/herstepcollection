# HerStep Collection

Secure, mobile-first e-commerce platform for HerStep Collection, built with static HTML/CSS/JavaScript, Firebase, and Vercel serverless functions.

## Delivery status

This delivery completes all 10 phases: a premium responsive entry page, Firebase email/password account flow, secure catalogue/checkout/PrintPay payments, tracking, notifications, real-time support, customer requests, promotions, promo codes, an administrator operations dashboard, analytics, audit logs, and production hardening.

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

Phase 4 integrates PrintPay's documented form-encoded `POST /stk_push` endpoint with the server-only `PRINTPAY_API_KEY`. It stores PrintPay's `checkout_id`, maps the documented callback result codes, and uses PrintPay's `GET /stk_push?check_status={checkout_id}` endpoint to independently confirm every successful callback before marking a payment `PAID`. PrintPay does not document a webhook signature scheme, so none is invented; success is confirmed through the documented status endpoint.

The server creates payments from trusted order totals, persists provider references, verifies callbacks before applying them, and processes callbacks in Firestore transactions. Browser code cannot supply payment status, amount, transaction references, receipt numbers, or provider data.

## Order tracking and notifications

`GET /api/orders/track` returns only the authenticated customer’s order, payment state, line-item snapshot, and server-managed timeline. `PATCH /api/orders/status` is administrator-only and records each permitted order transition in `orderStatusHistory`. Payment updates and order transitions atomically create one internal customer notification per event. No email, SMS, or push delivery provider is configured in this project, so no external delivery is claimed.

## Hardening, audit, analytics, and discoverability

Administrator mutations now append trusted Firestore `auditLogs` transaction records, including the administrator, action, target, prior state, next state, and timestamp. Audit logs are admin-read-only and deny all client writes. `GET /api/admin/analytics` computes recent order/revenue, popular-size, promo-code-use, payment-attempt, and support-resolution metrics server-side from Firestore.

Authenticated write paths for orders and new support tickets have a process-level rate limit as a defensive layer; all financial totals, promotion results, roles, and state transitions remain server-derived. Public promotion reads are short-cacheable. The storefront now provides Open Graph metadata, JSON-LD catalogue product metadata, `robots.txt`, and `sitemap.xml`.

## Customer dashboard

`GET /api/dashboard` aggregates only the authenticated customer’s profile delivery data, recent order summaries, payment summaries, and notifications. `GET /api/notifications` is customer-scoped and `PATCH /api/notifications` marks only the owner’s notification read; repeat read requests are idempotent.

## Support tickets and real-time chat

`POST /api/support` creates a customer-owned ticket and its initial message in a Firestore transaction. Tickets receive a server-managed `SUP-000001` style identifier and may only link to an order owned by that customer. `POST /api/support/messages` verifies ownership (or the trusted server-side administrator role) before appending a message beneath `supportTickets/{ticketId}/messages/{messageId}`. The client supplies an idempotency key for each message, so retrying an admin reply cannot produce a duplicate message or notification.

Customers and administrators read message threads with Firestore `onSnapshot` listeners, while all writes remain behind verified API endpoints. Customer ticket access is constrained to `customerId`; the administrator list and status endpoint rely on `requireAdmin`, which reads the trusted `users/{uid}` role document. Statuses are `OPEN`, `IN_PROGRESS`, `RESOLVED`, and `CLOSED`; transitions are server-guarded and recorded in an append-only ticket history subcollection. Admin replies create one deterministic customer notification, and customer messages set `hasUnreadAdminMessages` on the ticket for the admin support queue.

## Requests, promotions, and promo codes

Customers may create server-authorized discount or bulk-order requests. Administrators alone can approve or reject them; reviews use Firestore transactions, append immutable request-history records, and create deterministic customer notifications. Promotional campaigns and promo codes are administrator-authored only. Customer promotion reads return only active campaigns within their date window.

Checkout accepts a promo *code* only, never a client discount or total. The order transaction reloads the promo-code document, verifies its window, minimum order value, product/category applicability, total usage and per-customer usage, calculates the discount from server-priced items, and atomically increments both counters before writing the price snapshot on the order.

## Administrator dashboard

`/admin.html` is a separate, authenticated operations view. Its server-only dashboard endpoint requires `requireAdmin` and reads live Firestore aggregates for orders, payments, support, customer-request queues, promotions, and promo-code usage. Admin order transitions and request decisions reuse the existing verified endpoints instead of duplicating state-change logic.

## Integration contract and required configuration

Copy `.env.example` into the Vercel project settings and supply the Firebase Web config and Firebase Admin service-account fields. `FIREBASE_ADMIN_PRIVATE_KEY` must preserve newlines (the server supports escaped `\\n`). The Cloudinary values enable the authenticated product-media signing endpoint. Configure `PRINTPAY_API_KEY` server-side in Vercel; `PRINTPAY_API_BASE_URL` defaults to the documented API URL.

Deploy Firestore rules and indexes with the Firebase CLI after selecting the correct Firebase project:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Phase 11 account, email, and announcements

Registration now requires a Kenyan mobile number. The server normalizes accepted values to `+2547XXXXXXXX` (and accepts the equivalent `2547XXXXXXXX`/`07XXXXXXXX` input); the saved profile phone pre-fills checkout but can be overridden for an individual M-Pesa order. Profiles also contain an owner-controlled `marketingConsent` flag.

Brevo transactional mail is configured only with server-side variables: `BREVO_API_KEY`, `BREVO_SENDER_DOMAIN`, `BREVO_SENDER_HELLO`, `BREVO_SENDER_SUPPORT`, `BREVO_SENDER_ORDERS`, `BREVO_SENDER_NAME`, `BREVO_REPLY_TO_EMAIL`, and `BREVO_LIST_ID`. Transaction state changes place deterministic documents in the `emailOutbox` collection, which prevents repeated transaction attempts from creating duplicate email work. `POST /api/admin/brevo-contacts` is administrator-only and syncs only opted-in users to the configured Brevo list; promotional broadcasts must use Brevo Campaigns, not the transactional email endpoint.

`POST /api/auth/otp/request` and `POST /api/auth/otp/verify` are authenticated server endpoints. OTPs are hashed, expire after ten minutes, and cannot be accepted through a browser-supplied verification flag. Administrators control the public announcement document with `PATCH /api/admin/announcement`; customers can retrieve only an enabled announcement through `GET /api/announcement`, and the storefront dismisses it for the current session.

## Delivery plan

1. **Complete:** architecture, Firebase authentication, profile setup, Firestore structure/security.
2. Product catalogue, categories, size-aware inventory, Cloudinary signing.
3. Server-validated cart, checkout, atomic orders, order IDs.
4. M-Pesa STK initiation, signed webhook processing, payment records and receipts.
5. Tracking, status history, notifications.
6. Customer dashboard.
7. **Complete:** real-time support tickets and chat.
8. **Complete:** requests, promotions and server-validated promo codes.
9. **Complete:** role-gated admin dashboard.
10. **Complete:** analytics, audit coverage, SEO/performance, final security and mobile review.
