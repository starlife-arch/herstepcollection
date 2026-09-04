HERSTEP COLLECTION — FULL E-COMMERCE PLATFORM DEVELOPMENT PROMPT

Build a production-ready, secure, modern full-stack e-commerce platform for a Kenyan ladies' footwear business called:

HERSTEP COLLECTION

TAGLINE:
Step Into Your Style.

The platform must NOT feel like a generic shoe/fashion website.

It should feel like a premium, modern e-commerce + fintech platform with excellent UX, clean dashboards, reliable payments, proper order management, customer accounts, receipts, tracking, support messaging and administration.

==================================================
1. CORE TECHNOLOGY STACK
==================================================

FRONTEND:
- HTML
- CSS
- Vanilla JavaScript
- Use reusable components/modules
- Avoid unnecessary frameworks
- Do NOT use Next.js unless absolutely required
- Keep the architecture simple and maintainable

HOSTING:
- Vercel

DATABASE:
- Firebase Firestore

AUTHENTICATION:
- Firebase Authentication

MEDIA STORAGE:
- Cloudinary

PAYMENTS:
- M-Pesa STK Push through an external payment/STK API provider that will be supplied separately

SERVER:
- Vercel Serverless/API Functions

SECRETS:
- Store all sensitive credentials in Vercel Environment Variables

Never expose:
- STK API secrets
- Payment credentials
- Webhook secrets
- Cloudinary private/API secrets
- Firebase Admin credentials

in frontend JavaScript.

==================================================
2. DESIGN PHILOSOPHY
==================================================

The entire platform must have a premium fintech/e-commerce appearance.

Design inspiration:

- Modern fintech dashboard
- Premium e-commerce
- SaaS dashboard
- Clean banking interface
- Professional customer portal

The UI should be:

- Clean
- Minimal
- Premium
- Modern
- Fast
- Professional
- Mobile-first
- Spacious
- Easy to understand

DO NOT make it look like:

- A cheap fashion template
- A basic Shopify clone
- A social-media shop
- A colorful marketplace
- A cartoon website

DO NOT USE EMOJIS IN THE WEBSITE UI.

Use professional icons instead.

Use an icon library such as Lucide Icons where appropriate.

Use:

- Strong typography
- Subtle borders
- Clean cards
- Soft shadows
- Restrained brand colors
- Professional tables
- Clear status badges
- Consistent spacing
- Smooth but subtle animations

Avoid excessive:

- Gradients
- Shadows
- Animations
- Rounded elements
- Bright colors
- Pink/purple fashion aesthetics

==================================================
3. BRAND INFORMATION
==================================================

Business:

HerStep Collection

Tagline:

Step Into Your Style.

Business type:

Ladies' footwear.

Location:

Juja Town
Jerry House, near Juja Posta
Outside Shop No. 12

Phone:

+254 799 021 089

WhatsApp:

+254 106 624 924

Email:

herstepcollection@gmail.com

==================================================
4. PRODUCTS
==================================================

HerStep Collection sells ladies' footwear including:

- Thrifted & Fancy Summer Sandals
- Platform Shoes
- Laser-Up Shoes
- Block Heels
- Stiletto Heels
- Kitten Heels
- Flats
- Mary Jane Low-Cuts

Admin must be able to create additional categories.

Products must support:

- Product name
- Description
- Category
- SKU
- Price
- Sale price
- Available sizes
- Stock quantity
- Multiple images
- Product video
- Product status
- Featured status
- Bestseller status
- New arrival status
- Created date
- Updated date

==================================================
5. PRODUCT INVENTORY
==================================================

Inventory must be size-aware.

Example:

Black Platform Loafer

Size 37 = 0
Size 38 = 2
Size 39 = 1
Size 40 = 0

Customers must only be able to purchase available sizes.

If a size has zero stock:

Disable that size.

If all sizes are unavailable:

Display:

SOLD OUT

Allow the customer to optionally request a restock notification.

Prevent overselling.

Stock validation must happen server-side.

Do NOT trust stock information supplied by the browser.

==================================================
6. CLOUDINARY MEDIA SYSTEM
==================================================

Use Cloudinary for:

- Product images
- Product videos
- Support ticket images
- Support attachments where appropriate

Firestore should store:

- Cloudinary URL
- Public ID
- Resource type
- File type
- Metadata

Do NOT store large image/video files directly in Firestore.

Use Cloudinary transformations for:

- Resizing
- Compression
- Responsive images
- Thumbnails
- Optimized delivery

==================================================
7. CUSTOMER WEBSITE
==================================================

Create a public storefront.

Pages:

HOME
SHOP
PRODUCT DETAILS
CART
CHECKOUT
ORDER TRACKING
LOGIN
REGISTER
CUSTOMER DASHBOARD
SUPPORT
ABOUT
CONTACT
PRIVACY POLICY
TERMS

==================================================
8. HOME PAGE
==================================================

Create a premium homepage containing:

- Professional navigation
- Hero section
- Featured products
- New arrivals
- Best sellers
- Categories
- Current promotions
- Why shop with HerStep Collection
- Physical store information
- Delivery information
- Footer

Do not overcrowd the homepage.

Keep it visually clean.

==================================================
9. SHOP PAGE
==================================================

Create a professional product catalogue.

Features:

- Search
- Category filtering
- Size filtering
- Price filtering
- Availability filtering
- New arrivals
- Best sellers
- Featured products

Sorting:

- Newest
- Price low to high
- Price high to low
- Popularity
- Best sellers

Product cards display:

- Product image
- Product name
- Price
- Sale price where applicable
- Available sizes
- Stock status
- Add to cart
- Quick view

==================================================
10. PRODUCT DETAILS PAGE
==================================================

Display:

- Product gallery
- Multiple images
- Product video
- Product name
- Description
- Price
- Sale price
- Available sizes
- Stock
- Category
- SKU

Customer chooses:

Size
Quantity

Then:

ADD TO CART

If unavailable:

Clearly disable the option.

==================================================
11. CUSTOMER AUTHENTICATION
==================================================

Use Firebase Authentication.

Support:

- Email/password
- Google login if practical

Customer profile:

- Name
- Email
- Phone
- Delivery details
- Account creation date

Never expose private customer information to other customers.

==================================================
12. CUSTOMER DASHBOARD
==================================================

Create a premium dashboard.

Navigation:

Overview
My Orders
My Payments
Support
My Requests
Notifications
Profile
Security
Logout

==================================================
13. CUSTOMER DASHBOARD OVERVIEW
==================================================

Show:

Total Orders
Pending Orders
Completed Orders
Pending Payments
Open Support Tickets

Also display:

- Recent orders
- Recent payments
- Recent notifications

==================================================
14. CART
==================================================

Cart must show:

- Product image
- Product
- Selected size
- Quantity
- Unit price
- Total

Allow:

- Increase quantity
- Decrease quantity
- Remove item

Display:

Subtotal
Delivery fee
Discount
Total

Button:

PROCEED TO CHECKOUT

==================================================
15. CHECKOUT
==================================================

Collect:

- Full name
- Phone number
- Email
- Delivery method
- Delivery location
- Additional delivery instructions

Delivery options:

COLLECTION

or

DELIVERY

Collection location:

Juja Town
Jerry House, near Juja Posta
Outside Shop No. 12

Delivery fees should be configurable from admin settings.

Before payment show:

Order summary
Products
Sizes
Quantities
Subtotal
Delivery fee
Discount
Final total

==================================================
16. ORDER ID
==================================================

Every order must receive a unique human-readable order ID.

Format example:

HS-2026-000124

Do NOT use only the Firestore document ID.

Order IDs must be unique.

==================================================
17. PAYMENT SYSTEM
==================================================

Integrate the supplied M-Pesa STK Push provider.

Payment process:

1. Customer creates order
2. Order is created with pending payment
3. Customer initiates payment
4. Backend initiates STK Push
5. Customer receives M-Pesa prompt
6. Customer completes payment
7. Payment provider sends callback/webhook
8. Backend validates callback
9. Payment record is updated
10. Order payment status is updated
11. Customer receives confirmation
12. Receipt becomes available

IMPORTANT:

Never consider a payment successful simply because the frontend says so.

The server-side callback/webhook is the source of truth.

==================================================
18. PAYMENT STATUSES
==================================================

Support:

PENDING
PAID
FAILED
CANCELLED
TIMEOUT
REFUNDED

Handle duplicate callbacks safely.

Payment callbacks must be idempotent.

The same transaction must never create duplicate payment records.

==================================================
19. PAYMENT RECORD
==================================================

Store:

- Payment ID
- Order ID
- Customer ID
- Amount
- Phone number
- Payment method
- Provider reference
- Transaction reference
- Status
- Timestamp
- Callback data where appropriate
- Failure reason where appropriate

Do not store unnecessary sensitive payment information.

==================================================
20. PAYMENT RECEIPTS
==================================================

Generate a professional digital receipt.

Example:

HERSTEP COLLECTION

PAYMENT RECEIPT

Receipt Number:
HSP-839201

Order:
HS-2026-000124

Amount:
KSh 850

Payment Method:
M-Pesa

Transaction Reference:
XXXXXXXXXX

Date:
05 September 2026

Status:
PAID

Customer should be able to:

- View receipt
- Print receipt
- Download receipt where supported

==================================================
21. ORDER STATUS
==================================================

Order statuses:

PENDING
PROCESSING
PROCESSED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED

Payment status and order status MUST be separate.

Example:

Payment:
PAID

Order:
PROCESSING

is valid.

Another example:

Payment:
PENDING

Order:
PENDING

is valid.

==================================================
22. ORDER STATUS HISTORY
==================================================

Every order status change should create a history record.

Store:

- Previous status
- New status
- Timestamp
- Admin ID
- Admin name
- Optional note

Customer should see a timeline.

Example:

Order Placed
|
Payment Received
|
Processing
|
Processed
|
Out for Delivery
|
Delivered

Show timestamps for completed stages.

==================================================
23. ORDER TRACKING
==================================================

Create a public/order tracking page.

Customer can enter:

Order ID

Example:

HS-2026-000124

Logged-in customers can also track orders from their dashboard.

Display:

- Order ID
- Current order status
- Payment status
- Products
- Sizes
- Quantities
- Amount
- Delivery method
- Delivery location
- Order timeline
- Latest update

==================================================
24. ORDER CANCELLATION
==================================================

Allow cancellation only according to configured business rules.

Admin must have the ability to cancel orders.

If payment has already been made, cancellation must NOT automatically imply a refund unless a refund process has been explicitly implemented.

Never falsely mark a refund as completed.

==================================================
25. SUPPORT SYSTEM
==================================================

THIS IS ONE OF THE MOST IMPORTANT FEATURES.

Do NOT create a basic contact form.

Build a proper customer support ticket system that feels like a professional DM/chat application.

Customer clicks:

SUPPORT

Then sees:

- Open tickets
- Closed tickets
- Ticket IDs
- Subject
- Status
- Last message
- Last updated

Button:

NEW SUPPORT REQUEST

==================================================
26. SUPPORT TICKET CREATION
==================================================

Customer chooses category:

- Order Issue
- Payment Issue
- Delivery Issue
- Product Issue
- Return/Exchange
- General Enquiry
- Other

Customer enters:

Subject
Message

They can attach images.

Generate ticket ID:

SUP-000001

==================================================
27. SUPPORT CHAT UI
==================================================

When a ticket is opened, display a professional DM-style conversation.

Desktop:

Large chat modal/panel.

Mobile:

Full-screen chat experience.

UI should contain:

- Header
- Ticket ID
- Subject
- Status
- Message list
- Customer messages
- Admin messages
- Timestamps
- Image attachments
- Image preview
- Attachment button
- Message input
- Send button
- Sending indicator
- Read/unread state if implemented

Customer messages should appear on one side.

Admin messages should appear on the opposite side.

Do not copy WhatsApp's exact design.

Create a professional customer-support chat interface.

==================================================
28. REAL-TIME SUPPORT
==================================================

Use Firestore real-time listeners.

When admin replies:

Customer should see the message without refreshing.

When customer replies:

Admin should see it without refreshing.

==================================================
29. SUPPORT STATUS
==================================================

Support statuses:

OPEN
IN_PROGRESS
WAITING_FOR_CUSTOMER
RESOLVED
CLOSED

Admin can:

- Reply
- Upload images
- Change status
- Add internal note
- Close ticket

When closed:

Display:

"This support ticket has been closed."

Customer can create a new support ticket if needed.

==================================================
30. SUPPORT ATTACHMENTS
==================================================

Use Cloudinary.

Store:

- URL
- Public ID
- File type
- File name
- Sender
- Timestamp

Validate:

- File type
- File size
- Upload errors

Never allow arbitrary unsafe files to be uploaded without validation.

==================================================
31. CUSTOMER REQUEST SYSTEM
==================================================

Create:

REQUESTS

Customers can request:

- Discount
- Bulk order
- Specific shoe
- Restock
- Promotion
- Special offer

==================================================
32. DISCOUNT REQUESTS
==================================================

Example:

Customer:

"I want to buy 10 pairs. Can I get a better price?"

Store:

- Request ID
- Customer
- Products
- Quantity
- Proposed price
- Message
- Status
- Admin response
- Date

Statuses:

PENDING
REVIEWING
OFFER_SENT
ACCEPTED
DECLINED
CLOSED

==================================================
33. BULK ORDER REQUESTS
==================================================

Customer can submit:

Product/design
Quantity
Preferred sizes
Delivery location
Additional message

Admin can review and send a custom quotation.

==================================================
34. PROMOTIONS
==================================================

Admin can create:

- Percentage discounts
- Fixed discounts
- Product sales
- Category discounts
- Bulk discounts
- Promo codes
- Limited-time offers

Promotion fields:

Name
Description
Discount type
Discount amount
Products/categories
Start date
End date
Minimum order
Maximum usage
Active/inactive

==================================================
35. PROMO CODES
==================================================

Support promo codes.

Example:

HERSTEP10

Admin controls:

- Code
- Discount
- Expiry
- Usage limit
- Minimum purchase
- Applicable products/categories
- Active status

Validate promo codes server-side.

Never trust discounts calculated only in frontend JavaScript.

==================================================
36. NOTIFICATIONS
==================================================

Create an internal notification system.

Notify customers when:

- Order is placed
- Payment succeeds
- Payment fails
- Order starts processing
- Order is processed
- Order is out for delivery
- Order is delivered
- Order is cancelled
- Support receives a reply
- Support ticket is closed
- Discount request receives a response
- Bulk request receives a response
- Promotion becomes available

Create a notification centre.

==================================================
37. ADMIN DASHBOARD
==================================================

Create a completely separate admin dashboard.

Use a premium fintech/SaaS interface.

Navigation:

Overview
Orders
Products
Inventory
Customers
Payments
Support
Promotions
Discount Requests
Bulk Orders
Product Requests
Notifications
Admins
Settings
Audit Logs

==================================================
38. ADMIN OVERVIEW
==================================================

Dashboard cards:

Today's Sales
Total Orders
Pending Orders
Processing Orders
Out for Delivery
Delivered Orders
Pending Payments
Open Support Tickets

Also show:

- Recent orders
- Recent payments
- Recent support tickets
- Low stock products
- Customer requests

==================================================
39. ADMIN ORDER MANAGEMENT
==================================================

Admin can view:

- Order ID
- Customer
- Products
- Sizes
- Quantities
- Prices
- Subtotal
- Delivery fee
- Discount
- Total
- Payment status
- Payment reference
- Delivery details
- Order timeline
- Notes
- Support tickets

Actions:

- Change status
- Cancel order
- Add note
- View payment
- View customer
- Contact customer
- Open support

==================================================
40. ADMIN PRODUCT MANAGEMENT
==================================================

Admin can:

- Create product
- Edit product
- Archive product
- Delete product
- Add images
- Add videos
- Set price
- Set sale price
- Set sizes
- Set inventory
- Set category
- Set SKU
- Mark featured
- Mark bestseller
- Mark new arrival
- Mark sold out

==================================================
41. ADMIN INVENTORY
==================================================

Inventory must be size-based.

Display:

Product
SKU
Category
Size
Quantity
Status

Highlight low-stock products.

Allow inventory adjustments.

Every manual inventory adjustment should optionally record:

- Admin
- Previous quantity
- New quantity
- Reason
- Timestamp

==================================================
42. CUSTOMER MANAGEMENT
==================================================

Admin can view customers.

Display:

- Name
- Email
- Phone
- Registration date
- Order count
- Total spending
- Last order
- Account status

Do not expose sensitive information unnecessarily.

==================================================
43. PAYMENT MANAGEMENT
==================================================

Admin can view all payments.

Filters:

- Paid
- Pending
- Failed
- Cancelled
- Refunded

Search by:

- Payment ID
- Order ID
- Customer
- Phone
- Transaction reference

Admin must be able to open a payment and see relevant transaction information.

Do not allow arbitrary manual marking of payments as PAID without proper permission/audit logging.

==================================================
44. SUPPORT ADMIN PANEL
==================================================

Admin support dashboard should show:

- Open tickets
- In-progress tickets
- Waiting for customer
- Resolved
- Closed

Admin can:

- Open ticket
- Reply
- Attach images
- Change status
- Add internal note
- Assign ticket
- Close ticket

Customer must NEVER see internal notes.

==================================================
45. ADMIN ROLES
==================================================

Support roles:

CUSTOMER
ADMIN
SUPER_ADMIN

CUSTOMER:
Can only access own account/data.

ADMIN:
Can manage assigned business operations.

SUPER_ADMIN:
Can manage everything including admin users and permissions.

Use Firebase Authentication + Firestore Security Rules.

==================================================
46. FIREBASE SECURITY
==================================================

NEVER use insecure rules such as:

allow read, write: if true;

Use proper authentication and authorization.

Customers can only access their own:

- Orders
- Payments
- Support tickets
- Requests
- Notifications
- Profile

Admins can access data according to role.

Security must be enforced server-side and through Firestore rules.

Do not rely solely on hiding frontend pages.

==================================================
47. AUDIT LOGS
==================================================

Create audit logs for important admin actions.

Examples:

- Product created
- Product edited
- Product deleted
- Inventory changed
- Order status changed
- Payment reviewed
- Support ticket closed
- Promotion created
- Discount approved
- Admin account modified

Record:

Admin
Action
Target
Timestamp
Relevant metadata

==================================================
48. SEARCH
==================================================

Customer product search:

- Product name
- Category
- SKU

Admin search:

- Order ID
- Customer name
- Phone
- Email
- Payment reference
- Ticket ID
- Product SKU

==================================================
49. MOBILE DESIGN
==================================================

Mobile is extremely important.

Most customers will access the platform from phones.

The following must be optimized for mobile:

- Navigation
- Product catalogue
- Product page
- Cart
- Checkout
- Payment
- Order tracking
- Customer dashboard
- Support chat
- Admin dashboard

Support chat on mobile should feel like a native full-screen messaging interface.

Buttons must be touch-friendly.

Forms must be easy to complete.

==================================================
50. ERROR HANDLING
==================================================

Handle:

- Failed payments
- Pending payments
- Payment timeout
- Duplicate callback
- Network errors
- Empty cart
- Sold-out product
- Invalid size
- Invalid promo code
- Expired promotion
- Invalid order ID
- Cancelled order
- Unauthorized access
- Cloudinary failure
- Support upload failure

Show user-friendly messages.

Never expose stack traces, API keys or technical secrets to customers.

==================================================
51. PAYMENT SECURITY
==================================================

Never trust:

- Frontend price
- Frontend discount
- Frontend stock
- Frontend payment status
- Frontend admin role

Before creating/finalizing an order, server-side code must verify:

- Product exists
- Selected size exists
- Stock is available
- Current price is valid
- Discount is valid
- Total is correctly calculated

==================================================
52. ORDER RACE CONDITIONS
==================================================

Protect inventory from simultaneous purchases.

Example:

If only one size 38 remains and two customers attempt to purchase it at the same time, the backend must prevent both orders from successfully consuming the same stock.

Use appropriate Firestore transactions or server-side atomic operations.

==================================================
53. FIRESTORE STRUCTURE
==================================================

Use a clean scalable structure.

Suggested collections:

users
products
categories
orders
orderItems
payments
paymentTransactions
orderStatusHistory
supportTickets
supportMessages
discountRequests
bulkOrderRequests
productRequests
promotions
promoCodes
notifications
adminUsers
auditLogs
inventoryLogs
settings

Adjust the structure if a better Firestore architecture is appropriate.

Use indexes where necessary.

Use pagination for large datasets.

==================================================
54. WHATSAPP AI AGENT
==================================================

HerStep Collection also has a WhatsApp AI customer-service agent.

Official AI WhatsApp number:

+254 740 276 456

The AI should help customers with:

- Product information
- Available shoes
- Prices
- Sizes
- How to order
- How to pay
- Delivery information
- Physical shop location
- Promotions
- Discounts
- Bulk orders
- General customer questions

The AI must NOT invent:

- Product availability
- Prices
- Payment confirmations
- Order statuses
- Promotions
- Stock

Where possible, it should retrieve current information from the same backend/database.

For payment/order questions, it should direct customers to the official HerStep Collection ordering/payment system.

==================================================
55. WHATSAPP AI KNOWLEDGE
==================================================

Teach the AI about the available shoe types:

- Thrifted & Fancy Summer Sandals
- Platform Shoes
- Laser-Up Shoes
- Block Heels
- Stiletto Heels
- Kitten Heels
- Flats
- Mary Jane Low-Cuts

If a customer doesn't know what they want, the AI can recommend products based on:

- Preferred style
- Budget
- Size
- Occasion
- Preferred heel height
- Color if available

The AI should recommend actual available products when the backend supports it.

==================================================
56. CUSTOMER COMMUNICATION RULE
==================================================

Official HerStep Collection contacts:

Phone:
+254 799 021 089

WhatsApp:
+254 106 624 924

AI WhatsApp:
+254 740 276 456

Email:
herstepcollection@gmail.com

Location:
Juja Town
Jerry House, near Juja Posta
Outside Shop No. 12

Customers should be warned about scams.

Never tell customers to send payment to unofficial numbers.

==================================================
57. ADMIN SETTINGS
==================================================

Admin settings should allow configuration of:

- Business name
- Phone
- WhatsApp
- Email
- Physical location
- Delivery fees
- Collection settings
- Payment settings
- Order settings
- Support settings
- Promotion settings
- Notification settings

Do not put secret API credentials in editable public settings.

==================================================
58. SEO
==================================================

Implement:

- SEO titles
- Meta descriptions
- Open Graph metadata
- Semantic HTML
- Clean URLs
- Sitemap
- Robots.txt
- Product metadata

Example product URL:

/shop/black-platform-loafer

==================================================
59. PERFORMANCE
==================================================

Optimize:

- Image loading
- Cloudinary transformations
- Lazy loading
- Firestore queries
- Pagination
- Caching where appropriate
- JavaScript bundle size
- Mobile performance

Do not load hundreds of products/orders/messages at once.

==================================================
60. ACCESSIBILITY
==================================================

Implement:

- Proper labels
- Keyboard navigation
- Accessible buttons
- Alt text
- Good contrast
- Focus states
- Semantic HTML
- Screen-reader-friendly structure

==================================================
61. RESPONSIVE ADMIN DASHBOARD
==================================================

Desktop admin:

Sidebar
Top navigation
Dashboard cards
Tables
Charts where useful
Modals

Mobile admin:

Collapsible navigation
Responsive tables
Mobile-friendly cards
Full-screen modals where necessary

Do not simply shrink the desktop interface.

Design mobile layouts properly.

==================================================
62. UI COMPONENT SYSTEM
==================================================

Create reusable components for:

- Buttons
- Inputs
- Selects
- Modals
- Toasts
- Cards
- Tables
- Status badges
- Dropdowns
- Product cards
- Pagination
- Loading states
- Empty states
- Confirmation dialogs
- Chat bubbles
- Timeline
- File uploader

Maintain a consistent design system.

==================================================
63. LOADING STATES
==================================================

Do not leave blank screens while data loads.

Use:

- Skeleton loaders
- Loading indicators
- Button loading states
- Upload progress where possible

==================================================
64. EMPTY STATES
==================================================

Create professional empty states.

Examples:

No orders yet.

No support tickets.

No notifications.

No products found.

No payment history.

Do not use emojis.

==================================================
65. SECURITY AGAINST COMMON ATTACKS
==================================================

Protect against:

- Unauthorized admin access
- Firestore data leakage
- Client-side price manipulation
- Payment spoofing
- Duplicate payment callbacks
- Duplicate orders
- Inventory race conditions
- Malicious uploads
- XSS
- CSRF where relevant
- Injection attacks
- Unauthorized API access

Validate all user input.

==================================================
66. ENVIRONMENT VARIABLES
==================================================

Create a clear environment-variable structure.

Examples:

FIREBASE configuration
FIREBASE ADMIN credentials
CLOUDINARY configuration
PAYMENT API configuration
PAYMENT CALLBACK/WEBHOOK secret
Other required service credentials

Never hardcode secrets.

Provide a .env.example file containing variable names only.

Do not put real credentials inside the repository.

==================================================
67. API STRUCTURE
==================================================

Create clean server endpoints/functions for:

Authentication-related operations where needed

Products
Orders
Payments
STK Push
Payment callback
Receipts
Support
Cloudinary upload/signing where required
Promotions
Discount requests
Bulk orders
Notifications
Admin operations

Keep payment-related endpoints server-side.

==================================================
68. DATABASE CONSISTENCY
==================================================

Important financial/order operations must be atomic where possible.

For example:

Creating an order
Reserving/decreasing inventory
Recording payment
Updating payment status

must be carefully designed to avoid inconsistent states.

Never allow:

Payment marked PAID but no order.

Order marked paid without verified payment.

Inventory becoming negative.

Duplicate transactions.

==================================================
69. RECEIPTS AND ORDER HISTORY
==================================================

Customers must always be able to see historical orders.

Each completed order should retain:

- Order ID
- Items
- Prices at time of purchase
- Sizes
- Quantities
- Delivery fee
- Discount
- Total
- Payment reference
- Payment status
- Order status
- Dates
- Status history

Do not dynamically replace historical prices when the product price changes.

==================================================
70. ADMIN ANALYTICS
==================================================

Create useful dashboard analytics:

- Sales today
- Sales this week
- Sales this month
- Orders
- Average order value
- Best-selling products
- Popular sizes
- Pending payments
- Completed orders
- Cancelled orders

Use simple professional charts.

Do not overload the dashboard with unnecessary analytics.

==================================================
71. CUSTOMER EXPERIENCE
==================================================

The ideal customer journey:

HOME
↓
SHOP
↓
PRODUCT
↓
SELECT SIZE
↓
ADD TO CART
↓
CHECKOUT
↓
PAY
↓
STK PUSH
↓
PAYMENT CONFIRMED
↓
RECEIPT
↓
ORDER TRACKING
↓
PROCESSING
↓
PROCESSED
↓
OUT FOR DELIVERY
↓
DELIVERED

At any point the customer should be able to access SUPPORT.

==================================================
72. ADMIN EXPERIENCE
==================================================

The ideal admin workflow:

LOGIN
↓
DASHBOARD
↓
VIEW ORDER
↓
VERIFY PAYMENT
↓
PROCESS ORDER
↓
UPDATE STATUS
↓
PREPARE DELIVERY
↓
OUT FOR DELIVERY
↓
DELIVERED

Admin can simultaneously manage:

Products
Inventory
Payments
Customers
Support
Promotions
Discount requests
Bulk orders

==================================================
73. BUSINESS RULES
==================================================

Product prices currently generally range from:

KSh 450 – KSh 800

Selected premium designs may go up to:

KSh 1,000

These prices must NOT be hardcoded throughout the website.

Admin must be able to change product prices.

==================================================
74. NO FAKE FUNCTIONALITY
==================================================

This is extremely important.

Do NOT create fake payment success.

Do NOT create fake order tracking.

Do NOT pretend an API is connected when it isn't.

If payment credentials are unavailable, create the proper integration architecture and clearly identify where credentials need to be inserted.

If an external API is unavailable, fail gracefully.

==================================================
75. DEVELOPMENT ORDER
==================================================

Build in this order:

PHASE 1
Project architecture
Firebase setup
Authentication
Firestore structure
Security rules

PHASE 2
Product catalogue
Categories
Inventory
Cloudinary

PHASE 3
Cart
Checkout
Orders
Order IDs

PHASE 4
STK Push
Payment callbacks
Payment records
Receipts

PHASE 5
Order tracking
Status history
Notifications

PHASE 6
Customer dashboard

PHASE 7
Support ticket + real-time DM chat

PHASE 8
Discount requests
Bulk orders
Promotions
Promo codes

PHASE 9
Admin dashboard

PHASE 10
Analytics
Audit logs
Security hardening
SEO
Performance
Mobile optimization

==================================================
76. CODE QUALITY
==================================================

Write clean maintainable code.

Avoid:

- Giant files
- Repeated code
- Hardcoded data
- Hardcoded credentials
- Duplicate functions
- Unnecessary dependencies
- Unused code

Use clear naming conventions.

Comment important business logic.

==================================================
77. TESTING
==================================================

Test:

Registration
Login
Logout
Product browsing
Search
Filtering
Cart
Checkout
Order creation
STK Push
Payment callback
Duplicate callback
Failed payment
Successful payment
Receipt
Order tracking
Inventory
Concurrent purchases
Support tickets
Real-time support
Image upload
Admin permissions
Customer permissions
Promo codes
Discount requests
Bulk orders
Mobile layouts

==================================================
78. FINAL SECURITY REVIEW
==================================================

Before considering the application complete, inspect:

Firebase Security Rules
API authorization
Admin authorization
Payment verification
Webhook security
Cloudinary uploads
Inventory consistency
Price validation
Discount validation
Customer data isolation
XSS protection
Input validation
Environment variables

==================================================
79. FINAL UI REVIEW
==================================================

The final product should look like a real commercial platform.

Ask:

Does this look like a serious e-commerce business?

Does the checkout feel trustworthy?

Does the payment experience feel professional?

Does order tracking feel clear?

Does the support chat feel like a proper customer-service platform?

Does the admin dashboard feel like a real business management system?

Does it look excellent on a phone?

If not, improve the UI before considering it finished.

==================================================
80. IMPORTANT FINAL INSTRUCTION
==================================================

Do not rush directly into generating thousands of lines of code.

First produce:

1. Architecture
2. Folder structure
3. Firestore schema
4. Security model
5. Authentication flow
6. Payment flow
7. Order state machine
8. Support architecture
9. API structure
10. Environment variables
11. Implementation plan

Then implement the system step-by-step.

Every stage must remain functional.

The final result must be a secure, scalable, production-ready HerStep Collection e-commerce platform hosted on Vercel using Firebase, Cloudinary and the supplied STK Push provider.

The platform must prioritize:

SECURITY
PAYMENT RELIABILITY
ORDER ACCURACY
INVENTORY ACCURACY
CUSTOMER EXPERIENCE
MOBILE UX
PREMIUM UI
SCALABILITY
MAINTAINABILITY

No emojis in the website UI.

Brand:

HERSTEP COLLECTION

Tagline:

STEP INTO YOUR STYLE.
