# HerStep Collection Development Instructions

Before making changes, read HERSTEP_SPEC.md.

HERSTEP_SPEC.md is the project's primary product and technical specification.

Follow its requirements for:
- Architecture
- UI/UX
- Firebase
- Firestore
- Authentication
- Payments
- STK Push
- Orders
- Inventory
- Cloudinary
- Support
- Promotions
- Admin dashboard
- Security
- Mobile UX

Do not expose secrets.

Do not use fake payment confirmations.

Do not weaken Firebase Security Rules.

Do not introduce unnecessary frameworks.

Before major implementation work, inspect the existing repository and preserve working functionality.

After making changes, test the affected functionality and fix errors before moving to the next phase.
