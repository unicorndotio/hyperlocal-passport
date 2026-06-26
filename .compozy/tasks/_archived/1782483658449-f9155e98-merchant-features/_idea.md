# Passaporte Local — Merchant Features

## Overview

Passaporte Local currently has a placeholder coupon system where "basic" and "special" coupon types are behaviorally identical and only support percentage-based discounts. Businesses need a flexible coupon engine to create promotions that actually drive foot traffic, a checkout system that handles any discount type at the point of sale, and visibility into whether their promotions are working.

**Problem:** The current coupon system is non-functional — the type dropdown is cosmetic, checkout only computes percentage math, and businesses have no feedback loop showing whether their coupons drive sales. Without these tools, the platform cannot deliver on its core value proposition: giving businesses cost-effective customer acquisition through targeted promotions.

**Who it is for:** Business owners and cashiers in Jurerê who need to create, manage, and validate coupons at the physical point of sale.

**Why it is valuable:** A flexible coupon engine with template presets makes powerful promotions accessible to micro-entrepreneurs. Analytics closes the loop — businesses see that their coupons drive visits, giving them a reason to stay subscribed. The checkout rework ensures every coupon type is validated correctly and quickly at the counter.

**V1 scope:** Full coupon engine with 4 behavior types (Percentage Discount, Fixed Amount, Buy X Get Y Free, Item-Specific) × full restriction matrix, accessed through template presets for simplicity. Checkout validation panel reworked to handle all types. Coupon analytics dashboard showing views-to-validation funnel. Opening hours UI fix.

## Summary / Differentiator

Most Brazilian SMB loyalty tools (Grazie, Muyto, Fidelo) offer single-business stamp/points/cashback programs. None offer a flexible multi-behavior coupon engine with per-business control over restrictions. The combination of percentage, fixed, BOGO, and item-specific discounts with configurable caps, frequency limits, and time windows is uncommon in the Brazilian micro-SMB market. Adding template presets removes the complexity gap — micro-entrepreneurs get powerful promotions without a learning curve. Analytics closes the loop that most SMB tools miss: "did my coupon actually bring customers?"

## Problem

Business owners in Jurerê want to run promotions — "10% off for residents," "double chopp on game day," "R$5 off pastéis after 6pm" — but the current system only supports a flat percentage discount on the entire order. The "basic" vs "special" coupon type is a UI artifact with no behavioral difference, and the checkout panel can only compute `amount × percent / 100`. This means:
- A bar cannot offer "buy 2 get 1 free" for a football match
- A bakery cannot give "R$5 off on purchases over R$30"
- A restaurant cannot offer "50% off on specific items expiring today"
- No business can see whether their coupons actually drove visits

The global hyperlocal services market is valued at $2.9T (2025) and projected at $13.5T by 2034 (18.7% CAGR). Brazilian loyalty program members return 2.5x more frequently (ABRASCE). Yet no Brazilian player currently owns "neighborhood-wide multi-business loyalty" — and the ones that exist (Grazie, Muyto, Fidelo) are single-business programs with limited coupon types.

Small business loyalty tools charge $0–49/month (85%+ of the market) or R$85–400/month in Brazil. Standard features include percentage and fixed-amount discounts; BOGO and item-specific discounts are premium-tier features. By offering all four in a simple interface with templates, Passaporte Local competes at the standard tier with premium capabilities.

### Market Data

- Hyperlocal services market: $2.9T (2025), projected $13.5T by 2034 (CAGR 18.7%)
- Brazilian loyalty members return 2.5x more frequently (ABRASCE)
- 85%+ of SMB loyalty tools charge $0–49/month
- Brazilian SMB loyalty tools charge R$85–400/month
- No major Brazilian player owns "neighborhood commerce/loyalty" specifically

## Core Features

| # | Feature | Priority | Description |
| --- | ------- | -------- | ----------- |
| F1 | Flexible Coupon Engine | Critical | Coupon system with 4 behavior types (Percentage Discount, Fixed Amount, Buy X Get Y Free, Item-Specific) × composable restrictions (Global Cap, User Cap, Valid From/Until, Usage Frequency, Max Units per Redemption, Application Scope, Minimum Purchase Value). Behavior and restrictions stored as an embedded discriminated union on the Coupon document. |
| F2 | Coupon Template Presets | Critical | Pre-configured templates ("Simple Discount", "Flash Sale", "Loyalty Perk", "Event Promo", "Item Clearance") that pre-fill restriction defaults. Business picks a template, sets the discount value, and publishes — without configuring every restriction field. Custom mode available for power users. |
| F3 | Coupon Analytics Dashboard | High | Per-coupon funnel: views (how many residents saw it) → redemptions (how many reserved it) → validations (how many used it at checkout). Aggregate metrics: total discount given, estimated incremental visits, most popular coupons. |
| F4 | Checkout Validation Panel Rework | Critical | Updated cashier-facing checkout to compute discounts for all behavior types. For percentage: current formula. For fixed amount: subtract amountCents from total. For BOGO: free items at zero cost, quantity tracking. For item-specific: per-unit discount × quantity. Must complete under 10 seconds. |
| F5 | Coupon Edit Endpoint | High | PATCH API for updating coupon fields (restrictions, behavior amount, active status). Currently coupons are create-only. |
| F6 | Opening Hours UI Fix | Low | Allow removing individual days from the opening hours editor (data model already supports null entries). Clear visual indicator for closed days. |

## KPIs

| KPI | Target | How to Measure |
| --- | ------ | -------------- |
| Coupons created per business | ≥ 3 avg within 30 days of activation | Coupon creation records grouped by business |
| Business activation rate | > 70% complete profile + create ≥1 coupon within 7 days of being enabled | Compare businesses enabled vs businesses with ≥1 coupon |
| Time to create a coupon | < 2 minutes from template selection to publish | Session timing on the coupon creation flow |
| Coupon redemptions to validations | > 60% of redeemed coupons validated within 7 days | Compare redemption.createdAt vs transaction.createdAt per code |
| Checkout error rate | < 5% of validation attempts return an error | Error responses / total POSTs to validate endpoint |

## Feature Assessment

| Criteria | Score | Rationale |
| -------- | ----- | --------- |
| **Impact** | Must do | The current coupon system is non-functional — the type selector does nothing. This is gating the entire platform's core value proposition. |
| **Reach** | Must do | Every business user will use coupons. Every cashier will use checkout. 100% of the business user base. |
| **Frequency** | Strong | Coupons created weekly; validation happens daily. Core interaction for business subscribers. |
| **Differentiation** | Strong | Flexible multi-behavior engine with templates + analytics is more powerful than most SMB tools. BOGO + Item-Specific is uncommon in Brazilian micro-SMB loyalty. |
| **Defensibility** | Strong | Each coupon a business creates increases switching costs. Analytics creates a "data moat" — businesses stay because they have performance history. Template presets lower the barrier to creating complex promotions. |
| **Feasibility** | Must do | All building blocks exist (KV, coupon/redemption/transaction models, CouponManager UI, CheckoutCalculator). Work is additive with clear migration path. |

**Leverage type:** Compounding Feature (each coupon a business creates deepens platform investment; each validation generates data that makes the platform more valuable)

## Council Insights

- **Recommended approach:** Build the full restriction engine in V1 — it's a one-time architectural investment. Use template presets to keep the UX simple (instead of feature flags or hiding behavior types). Add coupon analytics as a parallel track to close the feedback loop for businesses.
- **Key trade-offs:** Full restriction matrix has a larger testing surface vs shipping a subset now and expanding later. Council favored one-time investment because the restriction engine is the same work whether it gated 2 or 4 behaviors.
- **Risks identified:**
  - KV `findMany` fallback is O(N) scan — `coupons_by_businessId` index must be fixed for paginated listing before or alongside this work
  - Embedded discriminated union makes each Coupon document larger, potentially slowing scans
  - Existing coupons need migration: `discountPercent` → `behavior: { type: 'percentage_discount', percent }`
  - Template presets must be tested with real micro-entrepreneurs — wrong defaults create confusion
- **Stretch goal (V2+):** Evolve from discriminated union to orthogonal condition×effect×budget model. Coupon behaviors become composable predicates — enabling dynamic pricing, merchant-to-merchant cross-promotions, and surge discounts triggered by foot traffic data.

## Out of Scope (V1)

- **Posts and events / timeline feed** — The social timeline (Instagram-like posts, events, CTAs) is a separate V2 feature. This workflow focuses on coupons, checkout, and business tooling.
- **Coupon stacking** — Multiple coupons cannot be combined on a single purchase. Each coupon is redeemed and validated independently. Stacking rules (priority, mutual exclusion) are V2.
- **Multi-location business management** — Businesses operate a single location. Multi-location dashboards and per-location coupon targeting are V2.
- **Automated coupon expiry notifications** — No push or email notifications for expiring coupons. Businesses manage expiry manually. Notifications are Phase 2 of the broader platform.
- **Refunds or voided transactions** — Once a transaction is recorded, it is immutable. Refund handling is V2.
- **Offline validation mode** — Checkout requires internet connectivity. Offline QR scanning with async reconciliation is V2.

## Integration with Existing Features

| Integration Point | How |
| ----------------- | --- |
| Current Coupon model | Migration from flat `{ type, discountPercent, ... }` to discriminated union `{ behavior, restrictions, ... }`. Existing coupons auto-converted to `percentage_discount` behavior. |
| CheckoutCalculator island | Extended from single formula `amount * percent / 100` to strategy-dispatched calculation per behavior type. |
| CouponManager island | Reworked form: template selector first, then behavior-specific fields (conditional), then restriction panel. |
| Business profile (opening hours) | UI change only — allow removing day rows. Data model unchanged. |
| Redemption flow | Unchanged at the code-generation level. BOGO redemptions may need `behaviorSnapshot` on the Redemption document. |

## Architecture Decision Records

- [ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets](adrs/adr-001.md) — Embed behavior+restrictions as a typed discriminated union in a single Coupon document. Calculation dispatched via strategy pattern. Template presets simplify the UI instead of feature flags.

## Open Questions

- Template preset definitions: what are the exact default restrictions for each template? (e.g., "Flash Sale" = one-time + 7-day validity, "Loyalty Perk" = per-week frequency + no expiry). Need to validate with first business testers.
- BOGO same-item vs cross-item is the same behavior type — the difference is just in the UI template and scope configuration (scope: "same item" vs scope: "item A from category B"). A single behavior type covers both.
- Analytics data freshness: is a simple KV count sufficient, or do we need a materialized view? For V1 (one neighborhood, ~50 businesses), KV counters are fine.
- Default template when business first opens the coupon creator: "Simple Discount" (percentage off, no restrictions collapsed by default).
