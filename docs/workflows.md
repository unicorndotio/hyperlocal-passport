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