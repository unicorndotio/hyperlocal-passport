# PRD: Resident Frontend — Passaporte Local V1

## Overview

Passaporte Local is a mobile-first web application where neighborhood residents claim discounts at local businesses by redeeming coupons and showing a QR-code digital passport at the physical point of sale. The Resident Frontend is the primary user-facing interface of this system.

The V1 Resident Frontend gives residents a unified, friction-free way to discover local merchants, browse and redeem promotional coupons, and present a secure digital passport at checkout. It replaces physical coupon sheets and individual store loyalty apps with a single mobile-optimized web experience.

### Problem

Residents lack a single digital channel to discover and redeem neighborhood discounts. Carrying physical coupon sheets or installing separate apps for every small merchant leads to low adoption, app fatigue, and missed savings. Local merchants also lack a direct digital channel to announce daily specials, flash sales, and community events to neighborhood residents.

### Solution

A mobile-first Preact web application (Fresh 2) combining three integrated surfaces: a hybrid feed of savings updates and merchant posts, a business catalog with coupon redemption, and a premium digital passport that displays active discount codes via QR for in-store validation.

## Goals

- Deliver a polished V1 that establishes the core resident loop: register → discover → redeem → show passport → save money
- Achieve a coupon redemption rate above 10% within 90 days of launch
- Reach 150+ active residents generating passport QR codes weekly within 90 days
- Maintain checkout validation time under 3 seconds at the point of sale
- Keep POS validation failure rate below 2%

## User Stories

### Primary Persona: Neighborhood Resident

- As a resident, I want to register quickly with my CPF and photo documents so I can start using the passport
- As a resident, I want to browse a feed of available deals and merchant announcements so I can discover savings opportunities
- As a resident, I want to view a directory of local businesses with their details so I can learn about nearby merchants
- As a resident, I want to redeem a coupon with one tap so I can claim a discount instantly
- As a resident, I want to open my digital passport to show a QR code to the cashier at checkout
- As a resident, I want to see my active (unused) redemption codes in one place so I know which discounts I have available
- As a resident, I want to view my past redemptions and total savings so I understand the value of using the passport
- As a resident with a pending registration, I want to see my verification status so I know what to do next

### Secondary Persona: Local Merchant (via publishing tool)

- As a merchant, I want to publish text and image posts to the resident feed so I can announce promotions and events
- As a merchant, I want my published posts to appear alongside system-generated savings updates so residents see them in-context

### Secondary Persona: Admin

- As an admin, I want to approve or reject resident registrations so only verified residents can use the passport

## Core Features

### F1 — Hybrid Feed (Home Page)

The resident home page is a dynamic feed that automatically intersperses two types of content:

- **System-generated events**: coupon release announcements, transaction savings notices ("Maria saved R$ 20 at Padaria do Joao"), admin announcements
- **Merchant-authored posts**: text + image content published by verified business accounts

The feed uses lazy-loading for images and reverse-chronological ordering. It is the primary discovery surface and replaces the current catalog-as-home-page pattern. The catalog moves to a secondary bottom-nav tab.

### F2 — Business Catalog

A searchable, categorizable directory of active local businesses. Each business card shows name, category badge, and description. Tapping a business opens a detail page with full profile (logo, description, opening hours, social links) and a list of active coupons with individual redeem buttons.

Existing implementation from `/catalog` and `/business/[id]` routes is retained and enhanced with the feed-first navigation model.

### F3 — Coupon Redemption

Residents tap a "Resgatar Agora" button on any active coupon to generate a unique 6-character redemption code. Each redemption is validated against coupon rules (active period, global cap, per-user cap, minimum purchase) and creates an `active` status redemption record. The resident is redirected to the passport page on success.

Existing implementation at `POST /api/coupons/[id]/redeem` and the `RedeemButton` island is retained.

### F4 — Digital Passport

A premium Bento-style passport card that mirrors a physical Brazilian passport:

- **Cover**: Deep blue gradient card with passport-like branding, tapping triggers a 2D hardware-accelerated slide-and-fade transition
- **Inner pages**: Light yellow background showing the resident's active redemption codes, each with a QR code representation and business name. A "Savings history" view shows past redemptions with discount amounts, total savings, and per-business breakdown
- **Locked state**: Residents with `pending` or `rejected` status see a locked badge with a clear explanatory message, preventing passport opening and coupon redemption

The passport is the core emotional hook — the "wow" moment that differentiates Passaporte Local from generic coupon apps.

### F5 — Merchant Post Publishing

A simple web interface and API for verified business accounts to publish text + image posts to the resident feed. The publishing tool is intentionally lightweight: a form-based upload with text field and optional image. Merchant images are automatically compressed and optimized on upload.

### F6 — Verification Gating

Residents who register (with CPF, email, WhatsApp, and identity documents) start with `status=pending`. Until an admin approves them, the passport is locked and coupon redemption is blocked. The feed and catalog remain visible so residents can explore without friction.

Existing registration flow and admin approval endpoints are retained.

### F7 — Savings History

The passport includes a savings history view showing all past (used) redemptions with discount amounts and the business name. A running total savings counter communicates the cumulative value the resident has received. This makes the value proposition tangible and reinforces continued use.

Residents can only hold one active coupon per business at a time — coupon combinations are not supported and are intentionally designed out.

### F8 — Authentication

Residents sign up via a registration form (name, CPF, email, WhatsApp, document photo uploads) and log in via email/password. Session management uses Better Auth with the existing Drizzle adapter. Existing `LoginForm` and `RegistrationForm` islands are retained.

## User Experience

### Key Personas

- **Resident (primary)**: discovers deals, redeems coupons, shows passport at checkout
- **Merchant (secondary)**: publishes feed posts, creates coupons (via business admin)
- **Admin**: approves registrations

### Primary User Flow

1. Resident discovers Passaporte Local via referral, social media, or in-store signage
2. Resident opens the web app and sees the login/register screen
3. Resident registers with CPF, email, WhatsApp, and uploads identity documents
4. Resident explores the hybrid feed and/or catalog while awaiting approval
5. Admin approves registration
6. Resident taps "Resgatar Agora" on a coupon in the catalog
7. System generates a unique redemption code; resident is redirected to the passport
8. At the physical store, resident taps the passport cover, which animates open to reveal the QR code
9. Cashier validates the code via `POST /api/transactions/validate`
10. Resident sees the discount applied at checkout

### UI/UX Considerations

- Mobile-first layout: all pages designed for small screens first, with responsive desktop treatment
- Fixed bottom navigation bar with two primary tabs: Feed and Catalog, plus a passport entry point
- WCAG 2.2 AA compliance: sufficient color contrast, keyboard-navigable, visible focus states
- Bento design system tokens throughout: Primary `#FAD4C0`, Secondary `#80A1C1`, Surface `#FFF5E6`
- Passport animation uses hardware-accelerated CSS only (transform, opacity) — no JavaScript animation libraries
- All merchant images are lazy-loaded and displayed at optimized resolutions
- Loading states and empty states for the feed, catalog, and passport views

### Onboarding

- First-time visitors see a registration prompt or login
- Pending residents see a status banner explaining their verification is in progress
- The feed is visible to all visitors, encouraging exploration before registration

## High-Level Technical Constraints

- Mobile-optimized web application (no native app in V1) targeting modern smartphones
- Must work reliably on low-end devices and slower mobile connections
- Offline-tolerant: the QR display page should cache redemption data for offline viewing
- Checkout validation is online: cashier-facing validation requires network connectivity
- Merchant image uploads must be automatically compressed and optimized on the server
- All uploaded resident documents must be access-controlled (admin + resident only)
- Language: pt-BR (Portuguese), with date/currency formatting in Brazilian locale
- Existing PostgreSQL schema, Drizzle ORM, and Better Auth infrastructure must be reused

## Non-Goals (Out of Scope)

- Resident comments, likes, or reactions on feed posts
- Cashback, points accumulation, or virtual wallet features
- Interactive 3D WebGL passport flip animation
- Push notifications (mobile or browser)
- Self-service business onboarding (business registration is a separate flow)
- Multi-neighborhood filtering or admin tools
- Automated document verification via third-party SDK
- Resident profile editing or password change UI

## Phased Rollout Plan

### MVP (Phase 1)

- Hybrid feed with system-generated events and merchant-authored posts
- Merchant post publishing tool (form + API)
- Full Bento-style digital passport with 2D slide-and-fade transition
- Savings history showing past redemptions, discount amounts, and total savings
- Business catalog with category filter (existing, enhanced with feed-first nav)
- Coupon redemption flow (existing)
- Resident registration with verification gating (existing)
- Feed-first bottom navigation (Feed + Catalog + Passport)
- All existing authentication and session management

**Success criteria to proceed to Phase 2:**
- Coupon redemption rate > 10%
- 150+ active residents generating passport QR codes weekly
- 20+ merchant posts published per week
- Checkout validation time < 3 seconds (P95)

### Phase 2

- Resident profile page with edit profile and account settings
- In-app notification banner for new coupons and status changes
- Feed filtering (system-only / merchant-only / all)
- Enhanced merchant publishing with post scheduling

### Phase 3

- Resident social engagement (likes, comments on merchant posts)
- Gamification elements (savings leaderboard, community badges)
- Interactive 3D passport flip animation (WebGL)
- Offline-valid QR token for network dead zones

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Coupon redemption rate | > 10% | `redemptions.status=used` / total `redemptions` |
| Weekly merchant posts | > 20 posts/week | Count of merchant-authored posts per week |
| Active passport circulation | > 150 residents/week | Distinct users generating QR codes weekly |
| Checkout validation time | < 3 seconds (P95) | Time from cashier scan to validation response |
| POS validation failure rate | < 2% | Failed validations / total validation requests |
| Registration conversion | > 60% | Completed registrations / started registration forms |
| Feed engagement | > 3 feed scrolls/session | Average feed scroll depth per session |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low merchant adoption leads to empty feed | High — feed loses value without fresh content | Seed with system-generated events; build low-friction publishing UI; onboard anchor merchants before launch |
| Passport animation causes performance issues on low-end devices | Medium — poor UX at checkout | Use hardware-accelerated CSS only; test on target devices; provide fallback without animation |
| Content moderation overhead for merchant posts | Medium — inappropriate content damages trust | Manual moderation for V1 (admin reviews posts before publication); automated moderation considered for Phase 2 |
| Residents abandon registration due to document upload friction | Medium — low registration completion | Support photo capture via mobile camera; accept JPG/PNG/PDF; clear upload instructions in Portuguese |
| Cashier validation flow takes too long | High — merchant dissatisfaction | Online validation with 3-second target; clear error messages; quick retry support |
| Competition from established deal apps (Groupon, etc.) | Medium — user acquisition challenge | Differentiate with hyper-local neighborhood focus and premium passport UX; leverage community word-of-mouth |

## Architecture Decision Records

- [ADR-001: Scope and UX Decisions for V1 Resident Frontend](adrs/adr-001.md) — Replaces 3D flip animation with 2D transitions; implements hybrid social feed; enforces online validation parameters
- [ADR-002: V1 Resident Frontend Product Scope](adrs/adr-002.md) — Confirms feed-first navigation, merchant posts in V1, and full passport cover animation as the V1 scope

## Open Questions

- What is the ideal token expiry duration for the QR code display? (Proposed: tied to the session lifetime with no additional expiry)
- Should merchant posts require manual admin approval before appearing in the feed, or is post-and-revoke acceptable for V1?
- What is the target mobile viewport width for V1? (Proposed: 375px as minimum, per common Brazilian smartphone sizes)
- Should the feed include a "savings" counter showing total community savings? (Nice-to-have; defers to Phase 2 if unclear)
