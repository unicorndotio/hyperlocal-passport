# Passaporte Local — Product Requirements Document

## Overview

Passaporte Local is a mobile-first web application that connects neighborhood residents with local businesses through a discount and benefits club. Residents browse a catalog of businesses, select specific offers, and redeem them to generate unique single-use QR codes — presented at the physical point of sale for instant discounts (5-30%). Businesses pay a flat monthly subscription and manage their own coupons with fine-grained limits. This per-coupon redemption model prevents QR sharing and gives businesses precise control over their promotions.

**Problem:** Residents lack incentive to choose local merchants over chains and digital aggregators. Small businesses cannot afford the high commissions of delivery platforms (iFood charges 12-27%) or escalating digital ad costs, and generic loyalty programs fail to build neighborhood-level retention. The hyperlocal services market is valued at $2.9T globally (2025) yet most of that value leaks to global aggregators.

**Who it is for:** Neighborhood residents who want to save money and support their local economy. Small business owners who want cost-effective customer acquisition and repeat buyers from their own zip code.

**Why it is valuable:** Creates a closed-loop local economy — money stays in the neighborhood, residents save on everyday spending, businesses gain predictable repeat traffic. Brazilian loyalty program members return 2.5x more frequently (ABRASCE), and no major Brazilian player currently owns the "neighborhood-wide multi-business loyalty" space.

**V1 scope:** Launch in a single dense neighborhood (Jurerê, Florianópolis) with 10-15 businesses pre-onboarded. Prove the retention loop before expanding to additional neighborhoods after 3 months.

## Goals

- Onboard 500+ approved residents in the first 3 months
- Establish 50+ active businesses listed with self-managed profiles and coupons
- Reach 200+ monthly discount validations at physical POS by month 3
- Maintain average resident approval time under 24 hours
- Achieve >80% month-over-month business subscription renewal rate
- Activate >30% of approved residents (at least 1 validation ever)

## User Stories

### Resident

- As a resident, I want to register by uploading my ID and proof of residence so that I can access neighborhood-exclusive discounts.
- As a resident, I want to browse businesses by category (Casa, Corpo, Alimentação, Esporte, etc.) so that I can discover what my neighborhood offers.
- As a resident, I want to see each business's discount percentage, description, contact info, and opening hours so that I can decide where to shop.
- As a resident, I want to browse a business's available coupons, select one, and redeem it to get a unique QR code so that I have a single-use proof of discount at checkout.
- As a resident, I want to see my savings history so that I know how much I've saved using the platform.
- As a resident, I want to request a service that doesn't exist yet in the catalog so that the platform can recruit businesses I need.

### Business Owner

- As a business owner, I want to register my business myself so that I can get listed without waiting for admin setup.
- As a business owner, I want to manage my profile (logo, description, social media links, opening hours, online menu link) so that my listing stays accurate and attractive.
- As a business owner, I want to create and manage my own coupons and discounts so that I can run promotions on my schedule.
- As a business owner, I want a dashboard to validate resident passports at checkout so that I can calculate and apply discounts correctly.
- As a business owner, I want to see my validation history so that I can track how many customers the platform brings.

### Admin

- As an admin, I want to review and approve resident registrations by viewing uploaded documents so that only verified neighborhood residents get access.
- As an admin, I want to enable or disable businesses (as a payment gate) so that only paying subscribers remain active.
- As an admin, I want to view resident demand signals so that I can recruit businesses for requested service categories.

## Core Features

### F1 — Resident Registration with Document Verification

- Registration form collecting: name, CPF, email, WhatsApp, family member count, preference filters (categories of interest)
- Document upload: photo ID (RG/CNH) and proof of residence
- Status flow: pending → approved/rejected
- Pending users see a "waiting for approval" screen with 24-hour SLA messaging
- Approved users receive access to the full platform

### F2 — Business Catalog

- Mobile-first grid layout organized by service categories (Casa, Corpo, Alimentação, Esporte, Náutica, Entretenimento)
- Each business card shows: logo, name, category, discount range (e.g., "10-20% OFF")
- Business detail page: full profile with description, opening hours, social media links (Instagram, WhatsApp, Facebook), online menu link, map location, contact info
- Filtering by category and search by name

### F3 — Coupon Redemption and Digital Passport

- Resident browses a business's profile and views its available coupons (basic and special)
- Selecting a coupon and confirming redeems it — system generates a unique, short alphanumeric code (e.g., "JUR-X7F9") and displays it as a QR code
- The passport page lists all active (unused) redemption codes, each with its own QR code and the associated business/coupon name.
- The passport also display's the resident's name and CPF as a fallback identification method
- QR scanning is the primary validation method; the alphanumeric code can be typed as fallback
- Each redemption code is single-use: once validated at checkout it expires
- Coupon types:
  - **Basic coupon**: ongoing discount (e.g., 10% off), fine-tuned global redemptions and per-user monthly limits, common for store-wide offers
  - **Special coupon**: limited-time or limited-quantity offers with configurable global caps
- This per-coupon model prevents QR sharing (each redemption is unique to a user and coupon) and gives businesses fine-grained control over their discounting

### F4 — Business Validation Panel

- Web-based tool optimized for desktop/tablet at the physical store checkout
- Cashier validates by scanning the QR code (via webcam) or typing the alphanumeric redemption code
- System looks up the redemption, validates it is active and not expired, and shows: resident name, coupon title, discount percentage/amount
- Cashier enters the purchase total amount
- System calculates and displays: discount percentage, discount in R$, final amount
- Cashier confirms, system marks the redemption as used and records the transaction
- Must complete the full flow in under 10 seconds
- CPF typing is a secondary fallback: cashier can look up the resident by CPF, but the discount is still tied to a specific coupon — the cashier must also select which coupon applies

### F5 — Business Self-Service Registration and Profile Management

- Self-service sign-up: business name, CNPJ, category, email, password, logo upload
- Post-activation dashboard with:
  - Profile editor: logo, description, social media links, opening hours, online menu link
  - Coupon manager: create basic coupons (discount %, unlimited use) and special coupons (limited quantity, time-bound, user limits)
  - Validation history: list of all transactions with dates and amounts
- Admin can toggle the business active/inactive (payment gate). When inactive: dashboard inaccessible, business hidden from catalog, all coupons deactivated.

### F6 — Admin Backoffice

- Resident approval queue: list of pending registrations with document preview (photo ID, residence proof), approve/reject actions
- Business management: list all businesses with active/inactive toggle, view registration details
- Demand signal viewer: list of resident service requests by category and count
- User auditing: view all registered users and their status

### F7 — Resident Demand Signals

- "Request a service" button on the catalog page and global navigation
- Simple form: resident types the service/business they want (free text) and selects a category
- Signals are visible to admins only — used as intelligence for business recruitment

## User Experience

### Resident Journey

1. Resident discovers Passaporte Local via neighborhood WhatsApp group, flyer, or word of mouth
2. Opens the web app on their phone, browses the catalog (no account required) — sees real businesses and discounts available nearby
3. Signs up: fills registration form, uploads ID and proof of residence via phone camera
4. Sees "Your registration is under review. We aim to approve within 24 hours."
5. Receives email notification when approved
6. Logs in, browses the catalog, finds a restaurant offering 15% off
7. Opens the restaurant's profile, views their available coupons, and taps "Redeem" on the 15% off basic coupon
8. System generates a unique redemption code and displays it as a QR code on the passport page
9. Visits the restaurant, orders, and at checkout opens the passport page showing the active QR code
10. Shows the QR code to the cashier (or reads the alphanumeric code aloud)
11. Cashier scans/enters the code, system validates the coupon and shows the discount
12. Cashier enters total, system applies the discount, resident pays the reduced amount
13. Resident can later visit their savings history to see how much they've saved

### Business Owner Journey

1. Business owner hears about Passaporte Local from a neighbor or association
2. Visits the registration page, fills in business details, uploads logo, sets up account
3. Admin receives notification, confirms payment (external billing), enables the business
4. Business owner logs in, completes their profile (description, social media, hours, menu link)
5. Creates a basic coupon: "15% off for all Passaporte residents — no limit" (or a monthly cap) and a special coupon: "Chopp duplo — limitado a 100, apenas esta sexta-feira"
6. Opens the validation panel on a tablet or computer at the store counter
7. When a resident comes in, shows their passport QR code — cashier scans it, sees the specific coupon being redeemed (e.g., "15% off"), enters the total
8. System records the transaction, marks the redemption as used (preventing reuse)
9. Business owner can see how many redemptions occurred per coupon, how many special coupons remain, and estimate new customer value

### Admin Journey

1. Admin receives new registration notifications
2. Opens approval queue, reviews uploaded documents, approves or rejects
3. Manages businesses: reviews new registrations, confirms payment received (external), enables the business
4. Reviews demand signals periodically to identify which service categories are most requested
5. Recruits businesses in high-demand categories

## High-Level Technical Constraints

- **Web app only in V1** — no native mobile apps. Must be mobile-first and function as a PWA for home screen installation.
- **No payment processing in V1** — subscriptions are billed externally. In-store payments use the business's existing POS. The platform validates discounts only.
- **Validation must work < 10 seconds** — any longer and cashiers will skip the process.
- **QR code scanning is the primary validation method** — each redemption has a unique QR code that must be scannable via webcam. Alphanumeric code entry and CPF lookup are secondary fallbacks for businesses without webcams.
- **Documents must be securely stored and access-restricted** — ID photos and residence proofs are sensitive PII.

## Non-Goals (Out of Scope)

- **Marketplace / e-commerce** — No product listings, shopping cart, checkout, or delivery features. The platform validates discounts at physical POS only. Marketplace is Phase 3+.
- **Cashback or points accumulation** — No monetary balance, points system, or cashback inside the platform. Residents save through direct discounts at the time of purchase. Cashback is Phase 3+.
- **Self-service payment/subscription management** — No in-app payment or subscription management. Business subscriptions are billed externally (via invoice, PIX, or bank transfer). Admin enables/disables manually.
- **Classifieds / "Anuncie Aqui"** — No community classifieds, lost-and-found, paid ads, or sponsored listings. These are Phase 2 engagement tools.
- **Push notifications** — No push notification infrastructure in V1. Residents check the app proactively. Notifications are Phase 2.
- **Multi-neighborhood admin tools** — Admin dashboard handles one neighborhood in V1. Multi-neighborhood filtering and management is Phase 2.
- **Mobile apps (native)** — No iOS or Android native apps in V1. The web app must be mobile-first and installable as a PWA.
- **Automated document verification** — Manual admin review for V1. Automated verification using SDKs (e.g., idwall, Unico Check) is Phase 2.

## Phased Rollout Plan

### MVP (Phase 1) — Months 1-3

- **Core features delivered:**
  - Resident registration with manual document verification
  - Business catalog with categories and search
  - Coupon redemption engine (basic + special coupons with limits, unique code generation)
  - Digital passport page listing active redemptions with per-coupon QR codes
  - Business self-service registration and profile management
  - Business coupon creation and management (basic + special types with configurable limits)
  - Business validation panel (QR scan + code entry + discount calculation)
  - Admin approval queue and business enable/disable
  - Resident demand signals ("Request a service")
- **Success criteria to proceed to Phase 2:**
  - 500+ approved residents
  - 50+ active businesses
  - 200+ monthly discount validations in month 3
  - >30% resident activation rate

### Phase 2 — Months 4-6

- Self-service business onboarding with automated CNPJ validation
- Web push notifications for new businesses and expiring coupons
- Automated document verification (SDK integration)
- Classifieds and community engagement (simplified version)
- Multi-neighborhood admin tools and neighborhood selection for residents
- Expand to second neighborhood

### Phase 3 — Months 7+

- Marketplace with in-app purchases and delivery scheduling
- Cashback and points system with financial institution integration (Beach Pay-style)
- Native mobile apps (iOS + Android)
- Tiered business subscription plans with in-app payment
- Neighborhood economic dashboard for admins and business associations

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Approved residents | 500+ in 3 months | Registration records |
| Active businesses | 50+ in 3 months | Business profile records |
| Monthly discount validations | 200+/month by month 3 | Transaction records |
| Average approval time | < 24 hours | Time delta between registration and status change |
| Business renewal rate | > 80% month-over-month | Businesses active at month end / start of month |
| Resident activation rate | > 30% | Residents with ≥1 validation / total approved |

## Risks and Mitigations

- **Chicken-and-egg adoption:** Residents won't join without businesses; businesses won't join without residents.
  - *Mitigation:* Pre-onboard 10-15 businesses before marketing to residents. Use demand signals to show businesses there is unmet demand in their category.

- **Cashier friction kills the habit:** If validation takes more than 10 seconds or requires technical skill, cashiers will skip it.
  - *Mitigation:* Default to CPF typing (cashiers type 11 digits while talking to customer). QR scanning is secondary. The interface must have large buttons and minimal steps.

- **Manual verification bottleneck:** One admin reviewing documents won't scale beyond ~50 residents/day.
  - *Mitigation:* Target single-neighborhood scale first (well under 50/day). Plan automated verification for Phase 2 before multi-neighborhood expansion.

- **Jurerê overfitting:** A wealthy beach enclave may not represent other Brazilian neighborhoods.
  - *Mitigation:* Document demographic assumptions (income range, smartphone penetration, business density). Validate in a mid-income neighborhood in Phase 2.

- **Business profile quality:** Self-service businesses may create incomplete or unattractive profiles.
  - *Mitigation:* Require minimum fields (logo, description, category) for public visibility. Provide templates and examples during onboarding.

- **Payment confusion:** Business owners may not understand why their access was disabled.
  - *Mitigation:* Send email notification before disabling with clear reason and reactivation instructions.

## Architecture Decision Records

- [ADR-001: Single-Neighborhood Pilot Before Multi-Neighborhood Expansion](adrs/adr-001.md) — Launch V1 in one dense neighborhood. Prove retention loop before expanding horizontally.
- [ADR-002: Self-Service Business Registration with Admin Payment Gate](adrs/adr-002.md) — Businesses register and manage their own profiles and coupons. Admin enables/disables based on payment status.

## Open Questions

- What is the exact flat subscription price for businesses? User research validated flat fee over transaction fees, but pricing needs local market testing.
- Family member handling: can dependents use the same CPF-linked passport, or does each family member need their own account and QR code?
- Should the catalog be publicly visible (no login required to browse) or gated behind registration? Public browsing increases discovery but may reduce conversion incentive.
- How are demand signals categorized — are they tied to existing catalog categories or does the user pick from a predefined list?
- What email communication tool will be used for approval notifications and payment reminders?
