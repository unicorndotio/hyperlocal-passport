# Passaporte Local — Merchant Features Technical Specification

## Executive Summary

This TechSpec covers the technical implementation of the merchant features: a flexible coupon engine with 4 behavior types and composable restrictions; client-side template presets; a coupon analytics dashboard; checkout validation for all behavior types; interactive business onboarding; a 4-tab business dashboard redesign; and an opening hours UI fix.

**Key architectural decisions:**
- Coupon model refactored to a discriminated union of behavior types with an embedded restrictions object (ADR-001)
- All analytics counters stored in a dedicated `['analytics', couponId, metric]` KV prefix, decoupled from the Coupon document (ADR-003)
- Existing validate endpoint extended with optional `quantity` field for BOGO/item-specific (ADR-004)
- Template presets are client-side UI presets only — no server-side template storage
- Business dashboard gains a 4th Analytics tab (ADR-002)

**Primary trade-off:** Decoupling analytics counters from the Coupon document (ADR-003) increases KV reads per redemption from 1 to 2 but eliminates versionstamp contention on the coupon template under concurrent write load.

## System Architecture

### Component Overview

| Component | Responsibility | Type |
|-----------|----------------|------|
| **Coupon data model** (`lib/coupon.ts`) | Discriminated union for behavior + restrictions | Modified |
| **CouponEngine** (`lib/coupon-engine.ts`) | Strategy-dispatch calculation per behavior type | New |
| **Analytics counters** (`lib/analytics.ts`) | KV key builders for analytics prefix | New |
| **CouponManager island** (`islands/CouponManager.tsx`) | Template-based coupon creation UI | Modified |
| **CheckoutCalculator island** (`islands/CheckoutCalculator.tsx`) | Quantity input + multi-type discount display | Modified |
| **AnalyticsDashboard island** (`islands/AnalyticsDashboard.tsx`) | Per-coupon funnel + transaction history | New |
| **AdminCoupons island** (`islands/AdminCoupons.tsx`) | Cross-business coupon management | New |
| **AdminAnalytics island** (`islands/AdminAnalytics.tsx`) | System-wide analytics | New |
| **BusinessOnboarding island** (`islands/BusinessOnboarding.tsx`) | Interactive walkthrough overlay | New |
| **BusinessHeader** (`components/BusinessHeader.tsx`) | 4-tab navigation | Modified |
| **Redeem API** (`routes/api/coupons/[id]/redeem.ts`) | Analytics counter integration | Modified |
| **Validate API** (`routes/api/transactions/validate.ts`) | Multi-behavior discount calculation | Modified |
| **Coupon CRUD API** (`routes/api/coupons/[id].ts`) | New fields validation | Modified |
| **Admin coupon API** (`routes/api/admin/coupons/`) | Cross-business coupon CRUD | New |
| **Views counter** (`routes/business/[id].tsx`) | Increment view counter on page load | Modified |

### Data Flow

```
Business creates coupon
  → CouponManager island → POST /api/businesses/[id]/coupons
    → Coupon document stored as discriminated union in KV

Resident views coupon
  → GET /business/[id] → KV.increment(['analytics', couponId, 'views'])

Resident redeems coupon
  → POST /api/coupons/[id]/redeem
    → Check KV ['analytics', couponId, 'redemptions'] < restrictions.globalCap
    → Atomic: increment analytics counter + create redemption record

Cashier validates at checkout
  → POST /api/transactions/validate { code, amountCents?, quantity? }
    → Look up redemption + coupon
    → Dispatch to CouponEngine.calculate(behavior, amountCents, quantity)
    → Atomic: mark redemption used + create transaction + increment validation counter

Business views analytics
  → GET /api/businesses/[id]/analytics
    → Read analytics counters + transaction records → return funnel data
```

## Implementation Design

### Core Interfaces

```typescript
// lib/coupon.ts — Core types

type BehaviorType =
  | { type: 'percentage_discount'; percent: number }
  | { type: 'fixed_amount'; amountCents: number }
  | { type: 'bogo'; buyQuantity: number; freeQuantity: number; unitPriceCents: number }
  | { type: 'item_specific'; unitPriceCents: number; discountPerUnitCents: number }

interface CouponRestrictions {
  globalCap?: number
  userCap?: number
  validFrom?: number
  validUntil?: number
  usageFrequency?: 'one_time' | 'daily' | 'weekly' | 'monthly'
  maxUnitsPerRedemption?: number
  applicationScope?: { type: 'all' } | { type: 'categories'; ids: string[] } | { type: 'items'; ids: string[] }
  minimumPurchaseValueCents?: number
}

interface Coupon {
  id: string
  businessId: string
  title: string
  description?: string
  behavior: BehaviorType
  restrictions: CouponRestrictions
  isActive: boolean
  createdAt: string
}
```

```typescript
// lib/coupon-engine.ts — Discount calculation dispatch

interface CalculationInput {
  behavior: BehaviorType
  amountCents: number
  quantity?: number
}

interface CalculationResult {
  totalAmountCents: number
  discountAppliedCents: number
  finalAmountCents: number
}

function calculate(input: CalculationInput): CalculationResult {
  switch (input.behavior.type) {
    case 'percentage_discount':
      const discount = Math.floor(input.amountCents * input.behavior.percent / 100)
      return { totalAmountCents: input.amountCents, discountAppliedCents: discount, finalAmountCents: input.amountCents - discount }

    case 'fixed_amount':
      const applied = Math.min(input.behavior.amountCents, input.amountCents)
      return { totalAmountCents: input.amountCents, discountAppliedCents: applied, finalAmountCents: input.amountCents - applied }

    case 'bogo':
      const qty = input.quantity ?? 1
      const total = input.behavior.unitPriceCents * qty
      const sets = Math.floor(qty / (input.behavior.buyQuantity + input.behavior.freeQuantity))
      const freeItems = sets * input.behavior.freeQuantity
      const discountBogo = freeItems * input.behavior.unitPriceCents
      return { totalAmountCents: total, discountAppliedCents: discountBogo, finalAmountCents: total - discountBogo }

    case 'item_specific':
      const qtyItem = input.quantity ?? 1
      const totalItem = input.behavior.unitPriceCents * qtyItem
      const discountItem = input.behavior.discountPerUnitCents * qtyItem
      return { totalAmountCents: totalItem, discountAppliedCents: discountItem, finalAmountCents: totalItem - discountItem }
  }
}
```

```typescript
// lib/analytics.ts — KV key builders

const ANALYTICS_PREFIX = ['analytics'] as const

function viewCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'views']
}

function redemptionCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'redemptions']
}

function validationCountKey(couponId: string): string[] {
  return [...ANALYTICS_PREFIX, couponId, 'validations']
}
```

### Data Models

**Transaction** — extended to include `totalAmountCents` (previously the discount was based on the entered total; now totalAmountCents is the actual purchase value, which may differ from the amount used for discount calculation in BOGO/coupon cases):

```typescript
interface Transaction {
  id: string
  redemptionId: string
  couponId: string
  businessId: string
  userId: string
  totalAmountCents: number         // Actual purchase value (unitPrice * qty for BOGO/item-specific, or entered total)
  discountAppliedCents: number     // Calculated discount
  finalAmountCents: number         // totalAmountCents - discountAppliedCents
  timestamp: number
}
```

**Business** — added `hasSeenMerchantOnboarding` flag:

```typescript
interface Business {
  // ... existing fields
  hasSeenMerchantOnboarding?: boolean  // New: tracks if onboarding walkthrough was shown
}
```

### API Endpoints

**Modified endpoints:**

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/transactions/validate` | Accept optional `quantity` field. Dispatch calculation via `CouponEngine.calculate`. Check minimum purchase value. |
| `POST` | `/api/coupons/[id]/redeem` | Read redemption count from `['analytics', couponId, 'redemptions']` instead of `coupon.globalClaimedCount`. Atomic increment on analytics key. |
| `PATCH` | `/api/coupons/[id]` | Updated validation for new Coupon type shape (behavior + restrictions). |
| `POST` | `/api/businesses/[id]/coupons` | Updated validation for new Coupon type shape. |
| `GET` | `/api/businesses/[id]/coupons` | No change — returns full Coupon objects with new shape. |

**New endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/businesses/[id]/analytics` | Return per-coupon funnel data (views count, redemptions count, validations count, transaction list). |
| `GET` | `/api/admin/coupons` | List all coupons across all businesses with optional filters (businessId, status, date range). |
| `PUT` | `/api/admin/coupons/[id]` | Update any coupon (admin full access). |
| `DELETE` | `/api/admin/coupons/[id]` | Delete any coupon (admin full access). |
| `GET` | `/api/admin/analytics` | System-wide coupon analytics (total coupons, total views, total redemptions, total validations, total discount given). |

**New page routes:**

| Method | Path | Component |
|--------|------|-----------|
| `GET` | `/business/analytics` | `AnalyticsDashboard` island |
| `GET` | `/admin/coupons` | `AdminCoupons` island |
| `GET` | `/admin/analytics` | `AdminAnalytics` island |

### CouponEngine Implementation

The `CouponEngine` module in `lib/coupon-engine.ts` exports:

- `calculate(input: CalculationInput): CalculationResult` — pure function, no side effects
- `validateRedemption(coupon: Coupon, userId: string): ValidationResult` — capsule-level check (active, valid dates, global/user limits)
- `checkMinimumPurchase(totalCents: number, minimum?: number): boolean` — minimum purchase value check

The strategy dispatch uses a simple `switch` on `behavior.type`. No visitor pattern or registry — YAGNI for 4 known types.

## Integration Points

No new external services. The analytics counters use the existing Deno KV instance. The QR scanning continues to use the existing `html5-qrcode` client-side library.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `lib/coupon.ts` | Modified | Complete type change — old `Coupon` replaced with discriminated union | New types, remove `globalClaimedCount`, add `behavior` + `restrictions` |
| `lib/kv-adapter.ts` | None | No change needed — adapter works with any JSON-serializable object | None |
| `lib/business.ts` | Modified | Add `hasSeenMerchantOnboarding` optional field | Add field to `Business` interface |
| `routes/api/businesses/[id]/coupons.ts` | Modified | Updated validation for new Coupon fields | Update POST handler validation |
| `routes/api/coupons/[id].ts` | Modified | Updated validation for new Coupon fields | Update PATCH/PUT handler validation |
| `routes/api/coupons/[id]/redeem.ts` | Modified | Read from analytics key instead of `globalClaimedCount` | Replace counter read, add analytics key increment |
| `routes/api/transactions/validate.ts` | Modified | Branch on behavior type, optional quantity, minimum purchase check | Complete rewrite of calculation logic |
| `routes/business/[id].tsx` | Modified | Increment view counter | Add post-render KV increment |
| `islands/CouponManager.tsx` | Modified | Template selector, conditional behavior fields, restriction panel | Major UI rewrite |
| `islands/CheckoutCalculator.tsx` | Modified | Conditional quantity input, dynamic discount display | UI update |
| `components/BusinessHeader.tsx` | Modified | 4th tab for Analytics | Add "Analytics" link |
| `islands/BusinessProfileEditor.tsx` | Modified | Remove day toggle | Minor UI change |
| `islands/RedeemButton.tsx` | None | No change — already shows coupon data | None |
| `routes/passaporte.tsx` | None | No change — already shows QR code per redemption | None |

## Testing Approach

### Unit Tests

- `tests/coupon_engine.test.ts` (new) — Pure function tests for `calculate()`:
  - Percentage discount: exact math, floor rounding, zero amount
  - Fixed amount: under/over total amount, exact match
  - BOGO: exact sets, partial sets (remainder), single unit, max units
  - Item-specific: single unit, multiple units, zero quantity
  - Minimum purchase check: above/below threshold, no threshold set
- `tests/analytics.test.ts` (new) — KV key builder tests, counter increment idempotency

### Integration Tests

- `tests/checkout_api.test.ts` (modified) — New test cases for:
  - BOGO validation with quantity input
  - Item-specific validation with quantity input
  - Minimum purchase value enforcement (warning + disabled)
  - Mismatched amountCents vs calculated value
- `tests/coupon_redeem_api.test.ts` (modified) — Update to use analytics keys:
  - Global limit enforcement via analytics counter
  - Analytics counter increment on successful redeem
- `tests/coupon_api.test.ts` (modified) — CRUD tests with new Coupon shape:
  - Create with each behavior type
  - Update behavior/restrictions
  - Validation errors: missing required fields per behavior type

### Test Data

All tests create isolated coupon templates via the API. No test fixture files needed. Tests use in-memory KV (`Deno.openKv(':memory:')`) where possible.

## Development Sequencing

### Build Order

1. **Coupon data model + CouponEngine** — no dependencies
   - Replace `Coupon` type with discriminated union in `lib/coupon.ts`
   - Implement `calculate()` in `lib/coupon-engine.ts`
   - Implement analytics key builders in `lib/analytics.ts`
   - Remove `globalClaimedCount` from Coupon
   - Update all existing imports of `Coupon` to compile with new shape

2. **Coupon CRUD API + tests** — depends on step 1
   - Update POST `/api/businesses/[id]/coupons` validation for new fields
   - Update PATCH `/api/coupons/[id]` validation for new fields
   - Write `tests/coupon_api.test.ts` test cases for new Coupon shape
   - Write `tests/coupon_engine.test.ts` unit tests

3. **Redeem API with analytics counters** — depends on steps 1, 2
   - Update `redeem.ts` to read from `['analytics', couponId, 'redemptions']`
   - Update atomic transaction to increment analytics key
   - Remove `globalClaimedCount` from atomic check
   - Write `tests/coupon_redeem_api.test.ts` updates

4. **Validate API with multi-behavior dispatch** — depends on steps 1, 2, 3
   - Rewrite `validate.ts` to dispatch via `CouponEngine.calculate`
   - Add `quantity` to request body type
   - Implement minimum purchase value check
   - Write `tests/checkout_api.test.ts` updates + new test cases

5. **View counter** — depends on step 1
   - Add analytics key increment to `routes/business/[id].tsx` GET handler

6. **CouponManager island (templates + new form)** — depends on step 2
   - Add template selector UI (5 presets + Custom mode)
   - Add conditional behavior-type-specific fields
   - Add restriction panel (expandable collapsible)
   - Client-side validation for behavior-specific required fields

7. **CheckoutCalculator island (quantity input)** — depends on step 4
   - Add conditional quantity input field (shown for BOGO/item-specific)
   - Update success display to show itemized discount
   - Wire quantity to API call

8. **AnalyticsDashboard island + API** — depends on steps 3, 4, 5
   - Implement `GET /api/businesses/[id]/analytics` handler
   - Build AnalyticsDashboard island with funnel display and transaction history table
   - Create `/business/analytics` route

9. **BusinessHeader + new route** — depends on step 8
   - Add "Analytics" tab to BusinessHeader component
   - Add `/business/analytics` route

10. **BusinessOnboarding island** — depends on step 6
    - Create interactive walkthrough overlay component
    - Track `hasSeenMerchantOnboarding` on Business
    - Show on first login after feature deploy

11. **Admin coupon + analytics UI** — depends on steps 2, 8
    - Implement admin coupon API endpoints
    - Build AdminCoupons island + `/admin/coupons` route
    - Build AdminAnalytics island + `/admin/analytics` route

12. **Opening hours UI fix** — no dependencies
    - Add per-day toggle in `BusinessProfileEditor.tsx`

### Technical Dependencies

- None — all changes are within the existing codebase using Deno KV, Fresh, and Preact.

## Monitoring and Observability

- **Checkout error rate**: logged server-side on failed validation attempts. Tracked via the existing response pattern (error messages returned to client).
- **Analytics counter drift**: periodically (e.g., daily via a cron job in Phase 2) reconcile analytics counters against actual redemption/transaction record counts.
- **Onboarding completion rate**: track `hasSeenMerchantOnboarding` flag to measure how many businesses complete the walkthrough.

## Technical Considerations

### Key Decisions

- **Separate analytics KV prefix** (ADR-003): All counters in `['analytics', couponId, metric]` instead of on the Coupon document. Eliminates versionstamp contention on the coupon template.
- **Extend existing validate endpoint** (ADR-004): Single endpoint with optional `quantity` field instead of a new endpoint per behavior type.
- **Client-side templates**: Template presets are hardcoded defaults in the CouponManager island. No server-side template storage, no API, no database table.
- **Single CouponEngine module**: Pure functions in `lib/coupon-engine.ts`. No class hierarchy, no strategy registry — a switch statement over 4 variants is the simplest correct implementation.

### Known Risks

- **Analytics counter contention under high concurrency**: A popular coupon with 50+ concurrent redemptions could see atomic conflicts on the analytics key. Deno KV retries on conflict, so this manifests as latency, not data loss. If it becomes a problem in Phase 2, switch to an increment-only key (KV atomic `min` operation with integer).
- **Template preset defaults need validation**: The exact restriction values for each preset (e.g., "Flash Sale" = 7-day validity) affect business adoption. Should be validated with first business testers before setting in stone.
- **Cascading test updates**: The Coupon type change touches many files. Test fixtures and type references across the codebase need coordinated updates.

## Architecture Decision Records

- [ADR-001: Coupon Engine Architecture — Discriminated Union with Template Presets](adrs/adr-001.md) — Embed behavior+restrictions as a typed discriminated union in a single Coupon document. Calculation dispatched via strategy pattern. Template presets simplify the UI instead of feature flags.
- [ADR-002: Business Dashboard Layout — Cohesive Redesign with Dedicated Analytics Tab](adrs/adr-002.md) — Redesign the business dashboard with 4 tabs (Coupons, Checkout, Analytics, Profile) and interactive onboarding walkthrough.
- [ADR-003: Analytics Counters in Dedicated KV Prefix](adrs/adr-003.md) — Store all analytics counters in `['analytics', couponId, metric]` KV prefix instead of on the Coupon document. Decouples operational data from volatile counters.
- [ADR-004: Extend Existing Validate Endpoint with Optional Quantity Field](adrs/adr-004.md) — Extend `POST /api/transactions/validate` with optional `quantity` field for BOGO/item-specific coupon types instead of creating a new endpoint.
