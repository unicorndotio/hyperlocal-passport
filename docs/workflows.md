# Workflow History — Passaporte Local

Completed workflows in chronological order. Each section documents what was built, key decisions made, and any open questions left for future workflows.

---

## Workflow 1 — MVP Core

**Status:** Completed  
**Scope:** End-to-end MVP covering all three user roles.

### What Was Built
- Resident registration with document upload (RG/CNH + proof of residence)
- Admin approval queue with document viewer
- Business catalog with category filtering
- Digital Passport: QR code + alphanumeric fallback code per resident
- Business validation panel: CPF lookup / QR scan + checkout calculator
- Coupon management: basic and special coupon types (percentage-based)
- Admin business CRUD

### Architecture at This Point
- **Framework:** Deno Fresh 2 + Preact + TailwindCSS 4
- **Database:** Deno KV (edge-native key-value store)
- **Auth:** Better Auth with Deno KV adapter
- **Storage:** Local filesystem + Docker volume

### Key Decisions
- No payment gateway in MVP; subscriptions billed externally
- Web App (PWA) not a native app
- Coupon validation uses short alphanumeric codes (e.g. `JUR-X7F9`) to allow CPF-typing fallback at cashiers without a webcam
- Launched single neighborhood (Jurerê) before expanding

### North Star Metric
Number of discount validations completed at physical checkout per month.

---

## Workflow 2 — Merchant Features (Coupon Engine)

**Status:** Completed  
**Scope:** Reworked the coupon system from a cosmetic type selector to a fully functional flexible engine.

### Problem Fixed
The original `basic` / `special` coupon type was a UI artifact with no behavioral difference. Checkout could only compute `amount × percent / 100`. Businesses could not run any promotion other than a flat percentage off.

### What Was Built

**F1 — Flexible Coupon Engine**
- Coupon behavior stored as a discriminated union on the Coupon document
- 4 behavior types: `percentage_discount`, `fixed_amount`, `buy_x_get_y`, `item_specific`
- Composable restriction matrix: global cap, per-user monthly cap, valid from/until, min purchase value, max units, application scope
- Migration path: existing coupons auto-converted to `percentage_discount`

**F2 — Coupon Template Presets**
- 5 presets: Simple Discount, Flash Sale, Loyalty Perk, Event Promo, Item Clearance
- Each preset pre-fills sensible defaults; custom mode available
- Removes complexity barrier for micro-entrepreneurs

**F3 — Coupon Analytics Dashboard**
- Per-coupon funnel: views → redemptions → validations
- Aggregate metrics: total discount given, most popular coupons

**F4 — Checkout Validation Panel Rework**
- Strategy-pattern dispatch: checkout calculator handles all 4 behavior types
- Target: complete validation in < 10 seconds

**F5 — Coupon Edit Endpoint**
- `PATCH /api/coupons/:id` — update restrictions, behavior amount, active status
- Previously coupons were create-only

**F6 — Opening Hours UI Fix**
- Allow removing individual days from opening hours editor
- Data model was already correct; fix was UI-only

### Key Decisions
- Full restriction matrix implemented at once (one-time architectural investment) rather than incrementally
- Template presets used for simplicity instead of feature flags or hiding behavior types
- Discriminated union on single Coupon document (vs separate tables) for V1 scale

### Open Questions at Completion
- Template preset exact defaults need validation with first business testers
- Analytics data freshness: KV counters sufficient for V1 scale (~50 businesses)

---

## Workflow 3 — Database Migration (`db-migration`)

**Status:** Completed (all 17 tasks)  
**Scope:** Full migration from Deno KV to PostgreSQL via Drizzle ORM.

### Motivation
Deno KV's `findMany` falls back to O(N) full-table scans with no secondary indexes. As the catalog and transaction history grow, query performance degrades. PostgreSQL with Drizzle provides proper indexing, relational joins, and a migration toolchain.

### Task Summary

| # | Task | Notes |
|---|------|-------|
| 01 | Infrastructure Setup | PostgreSQL container, Drizzle config |
| 02 | Schema Definition & Initial Migration | All tables defined in `db/schema.ts` |
| 03 | Drizzle Client Singleton | `lib/db.ts` shared client |
| 04 | Better Auth Drizzle Adapter | Auth sessions in PostgreSQL |
| 05 | File Metadata Migration | File tracking table |
| 06 | User Registration & Approval Routes | Resident signup, admin approval |
| 07 | Business Routes Migration | Business CRUD, catalog |
| 08 | Coupon & Redemption Routes Migration | Full coupon engine + redemption flow |
| 09 | Transaction Validation Route | Checkout endpoint |
| 10 | Signals Routes & Rate Limit Removal | Demand signals, removed KV rate limiter |
| 11 | Admin Routes Migration | Approval queue, user management |
| 12 | User Redemptions & Upload Routes | Resident passport, file serving |
| 13 | Seed Script Rewrite | New seed for PostgreSQL |
| 14 | Cleanup & Final Configuration | Remove KV dependencies, env vars |
| 15 | Migrate Resident-Facing Page Routes | SSR pages using Drizzle |
| 16 | Migrate Business Page Routes | Business dashboard pages |
| 17 | Migrate Test Files | All tests use `passport_test` database |

### Architecture After Migration
- **Database:** PostgreSQL via Drizzle ORM (replaces Deno KV)
- **Auth sessions:** PostgreSQL via Better Auth Drizzle adapter (replaces KV adapter)
- **Rate limiting:** Removed (was KV-based); to be reimplemented if needed
- All other layers unchanged

### Key Decisions
- Dedicated `passport_test` database for test isolation; per-file `TRUNCATE` cleanup
- No Deno KV code remains in the codebase after task 14

---

## Workflow 4 — Resident Frontend V1

**Status:** Completed  
**Scope:** Replaced the default landing catalog with a hybrid social/system feed, implemented a persistent bottom-nav layout, built a premium Bento-style digital passport with hardware-accelerated animations, added a savings history tracker, created a merchant publishing interface, and set up a server-side image compression pipeline.

### Problems Fixed
- Residents lacked a single interactive timeline to discover new deals, merchant postings, and local community updates.
- The digital passport check-out experience felt plain and lacked a premium visual "wow" element.
- Merchant-authored post images were uncompressed and caused high bandwidth usage.

### What Was Built

**F1 — Hybrid Feed**
- DB schema table `merchant_posts` to store posts.
- Materialized View `feed_events` for O(1) query performance on globally public events (coupon releases, admin notices, merchant posts).
- Concurrent materialized view refreshes (`REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`) triggered on write operations.
- Backend feed query engine combining public feed events and user-specific recent savings notifications.

**F2 — Bottom Navigation**
- Shared `BottomNav` layout component applied to core user pages (Feed, Catalog, Passport), ensuring mobile-first tabbed app UX.

**F3 — Premium Digital Passport & Transitions**
- Bento-style passport card with a custom cover design.
- Custom hardware-accelerated 2D transitions (slide-and-fade) that open the passport.
- Access gating restricting pending and rejected users from opening the passport or generating redemption codes.

**F4 — Merchant Post Publishing & Image Pipeline**
- Simple post-creation form dashboard for verified business users.
- Server-side image optimization pipeline using `sharp` to automatically compress and resize merchant images upon upload.

### Key Decisions
- Public visitors are allowed to view the hybrid feed by bypassing the Better Auth middleware check for `/api/feed` requests.
- Concurrency was added to materialized view refreshes to prevent write locks during post or coupon publication.
- Animations were restricted to hardware-accelerated 2D CSS (transform, opacity) to ensure smoothness on lower-end mobile viewports.

---

## Workflow 5 — Partner Beta

**Status:** Completed (July 2026)
**Scope:** Finalised the business-facing product for a soft launch with initial business partners. Introduced expanded partner profiles, a simplified campaign creation flow, an admin partner ledger, inactive-business restrictions, and onboarding wizard fixes.

### Problems Fixed
- The onboarding wizard rendered behind page content due to missing `position: fixed` and z-index on center-positioned tooltip steps; background clicks dismissed it prematurely.
- Business profiles lacked physical address fields and a Google Maps link, making it impossible to populate the catalog with location data residents need.
- The coupon creation form exposed confusing configuration options (frequency caps, per-user limits) irrelevant to typical micro-entrepreneur workflows.
- Monetary inputs required raw cent values (e.g. `1500`) instead of natural BRL strings (`R$ 15,00`).
- Inactive (non-paying) businesses had no clear signal that they were restricted, and no path to reactivation.
- Admins had no structured way to record payments or track subscription expiration per business.

### What Was Built

**Task 01 — Database Schema Updates**
- Added `partner_ledger` table (`id`, `businessId` FK, `amountCents`, `months`, `paymentDate`, `createdAt`) with cascade-delete and an index on `businessId`.
- Added address columns to `businesses`: `cep`, `street`, `number`, `neighborhood`, `mapsUrl`, `expirationDate`.
- Generated migrations `0001_add_business_address_fields.sql` and `0002_add_partner_ledger.sql`; applied to dev DB.

**Task 02 — Business Profile API Updates**
- Extended `PUT /api/businesses/:id/profile` to validate and persist address fields and `mapsUrl`.
- Added `BUSINESS_CATEGORIES` constant (14 categories) to `lib/business.ts` as source of truth for category validation.
- CEP normalised to 8 digits on save; `mapsUrl` validated with `new URL()`.

**Task 03 — Admin Ledger API Endpoints**
- `POST /api/admin/businesses/:id/ledger` — inserts a `partner_ledger` row, sets `isActive = true`, and advances `expirationDate`.
- `POST /api/admin/businesses/:id/toggle` — manually overrides `isActive` and optionally `expirationDate`.

**Task 04 — Partner Profile Frontend Updates & Categories**
- `BusinessProfileEditor` island updated with read-only company info section, category dropdown, and all address/maps inputs.
- Category list replaced with the 14-category taxonomy.

**Task 05 — Partner Campaign Form Simplification**
- Four preset campaign models replace the previous five-preset set: Benefício Fidelidade, Promoção Relâmpago, Promoção de Evento, Liquidação de Item.
- Frequency and user-limit fields hidden; `maxUnits` shown only for BOGO and item-specific types.
- BRL currency mask (`Intl.NumberFormat`) applied to all monetary inputs; converted to/from integer cents at the API boundary.

**Task 06 — Admin Ledger UI Integration**
- `BusinessManager.tsx` updated with `expirationDate` column and a "Registrar Pgto" button per row.
- Log Payment modal includes BRL currency input, months field, and date picker; POSTs to ledger endpoint and updates the in-memory list on success.

**Task 07 — Inactive Dashboard State & Hide Analytics**
- `isBusinessActive` prop threaded from SSR routes into `BusinessHeader`, `MerchantPostForm`, and `CouponManager`.
- Inactive partners see a contact-us warning banner; create/edit actions are disabled across Coupons and Posts pages.
- Analytics navigation link removed from `BusinessHeader`; the analytics page remains accessible by direct URL. `BusinessHeaderTab` type union exported to keep `analytics.tsx` type-safe.

**Task 08 — Onboarding Wizard Fixes**
- Center-positioned steps now correctly apply `position: fixed` + `z-index: 1001` to the tooltip (previously `tooltipStyle` was `{}`).
- `onClick={handleDismiss}` removed from the backdrop div so background clicks no longer close the wizard.

### Architecture Changes
- New `partner_ledger` table; two new DB migrations.
- New admin API routes for ledger and toggle.
- `BUSINESS_CATEGORIES` in `lib/business.ts` is the canonical category list.
- No new services or external dependencies introduced.

### Key Decisions
- Inactive restrictions enforced via client-side UI disablement for beta speed (ADR-001); API-level checks deferred to post-beta.
- `partner_ledger` FK uses `onDelete: cascade` consistent with the project's ownership-chain pattern (ADR-002).
- Currency masking uses native `Intl.NumberFormat` (no extra library) to minimise bundle size.

### Open Questions at Completion
- API-level enforcement for inactive businesses should be fast-tracked if any beta partner attempts to bypass the UI restrictions.

---

## Open Questions (Across All Workflows)

These have not been resolved and should be addressed before or during the relevant future workflow:

| Question | Context |
|----------|---------|
| Family members / dependents: shared CPF or separate accounts? | PRD open question; affects passport UX |
| Do cashiers need to record which product was purchased, or is the total amount sufficient? | PRD open question; affects transaction data model |
| Flat subscription price for businesses | Needs market testing; user research prefers flat fee over % |
| Automated document verification SDK (idwall, Unico Check) | Phase 2 — when does manual approval become the bottleneck? |
| What validated metric triggers expansion from Jurerê to neighborhood #2? | Phase 2 go/no-go decision |
| Demand signal data model: signals tied to specific businesses, categories, or both? | Partially implemented; finalise for V2 mesh-network |
| Template preset exact defaults for each coupon type | Needs validation with first business testers |

---

## Planned Phases

| Phase | Focus |
|-------|-------|
| **Phase 2** | Engagement: push notifications, classifieds, self-service business onboarding, multi-neighborhood admin, automated document verification |
| **Phase 3** | Marketplace: e-commerce product catalog, payment gateway, cashback / Beach Pay integration |
| **V2+ (stretch)** | Neighborhood economic mesh: resident demand signals → business-to-resident offers → neighborhood analytics dashboard |