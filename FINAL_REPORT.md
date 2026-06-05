# Final Project Report: Passaporte Local (MVP)

## Project Overview
Passaporte Local is a mobile-first web application designed to connect neighborhood residents with local businesses through a benefits and discount club. The system facilitates secure coupon redemption and validation using a robust, edge-ready architecture.

## Technical Architecture
- **Framework:** Deno Fresh 2 (Preact + TailwindCSS)
- **Database:** Deno KV (Edge-native, ACID compliant)
- **Authentication:** Better Auth (with Deno KV adapter)
- **Storage:** Local Filesystem with Docker Volume persistence
- **Containerization:** Docker & Docker Compose

## Core Features Delivered

### 1. Resident Experience
- **Registration:** Comprehensive onboarding with document upload (RG/CNH and Proof of Residence).
- **Mobile Catalog:** Category-filtered browsing of partner businesses.
- **Coupon Redemption:** One-click redemption of 'Basic' (monthly) and 'Special' (limited) offers.
- **Digital Passport:** Personal dashboard showing active and used QR codes.

### 2. Business Experience
- **Validation Dashboard:** High-speed cashier interface for QR scanning or alphanumeric code input.
- **Checkout Calculator:** Automatic discount calculation and transaction recording.
- **Coupon Management:** Interface to create and manage specific offers and limits.

### 3. Admin Backoffice
- **Approval Workflow:** Queue for reviewing and approving/rejecting resident registrations.
- **Business Management:** CRUD for partner profiles and owner assignment.
- **User Auditing:** System-wide visibility into user roles and statuses.

## Technical Excellence & Security
- **Strict RBAC:** Middleware-enforced access control for Residents, Businesses, and Admins.
- **Ownership Validation:** API-level checks ensuring business owners only manage their own data.
- **Atomic Transactions:** Use of `kv.atomic()` for redemptions and checkouts to prevent double-spending and race conditions.
- **Edge Performance:** Optimized for low latency using Deno KV and SSR.
- **Consistent UX:** Centralized BRL currency formatting and standardized loading/error handling.

## Deployment Instructions
1. **Environment:** Ensure Docker and Docker Compose are installed.
2. **Configuration:**
   - Set `APP_BASE_URL` and `BETTER_AUTH_URL` in `.env`.
   - Ensure `BETTER_AUTH_SECRET` is a secure random string.
3. **Run:** `docker-compose up -d --build`
4. **Access:** The application will be available at `http://localhost:8000`.

## Future Recommendations
- **Notifications:** Implement e-mail or WhatsApp alerts for approval status and new offers.
- **Analytics:** Build a dashboard for businesses to track redemption trends over time.
- **Gateway Integration:** Future phase for paid premium subscriptions for special coupons.

---
**Status:** MVP Completed & Audited.
**Date:** June 5, 2026
