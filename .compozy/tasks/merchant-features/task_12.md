---
status: pending
title: Admin Analytics UI
type: backend
complexity: medium
dependencies:
  - task_08
---

# Task 12: Admin Analytics UI

## Overview

Implement the admin analytics endpoint and UI for system-wide coupon analytics. Admins need visibility into aggregate metrics across all businesses: total coupons, total views, total redemptions, total validations, and total discount given. This is the admin analytics half of the original step 11 from TechSpec.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `GET /api/admin/analytics` MUST return system-wide aggregate metrics: total coupons, total views, total redemptions, total validations, total discount given (in cents)
- The endpoint MUST aggregate data by reading analytics counters across all coupons
- The endpoint MUST include a breakdown per business (businessId, businessName, couponCount, totalViews, totalRedemptions, totalValidations)
- The AdminAnalytics island MUST display aggregate metrics in summary cards at the top
- The AdminAnalytics island MUST show a per-business breakdown table below the summary
- The `/admin/analytics` page route MUST render the AdminAnalytics island
- All text MUST be in English per project convention

## Subtasks

- [ ] 12.1 Implement `GET /api/admin/analytics` handler that aggregates analytics across all coupons
- [ ] 12.2 Build AdminAnalytics island with summary cards and per-business breakdown
- [ ] 12.3 Create `/admin/analytics` page route
- [ ] 12.4 Write integration tests for the admin analytics API

## Implementation Details

The admin analytics handler at `routes/api/admin/analytics.ts` (new):
1. Lists all coupons via `kv.list({ prefix: ['coupons'] })`
2. For each business, aggregates coupon counts and analytics counter values
3. Sums view/redemption/validation counters across all coupons
4. Calculates total discount given from transaction records or from summing across businesses
5. Returns `{ totalCoupons, totalViews, totalRedemptions, totalValidations, totalDiscountCents, perBusiness: [...] }`

The AdminAnalytics island at `islands/AdminAnalytics.tsx` (new) renders:
- Summary cards row at the top (Total Coupons, Total Views, Total Redemptions, Total Validations, Total Discount Given)
- A table below with per-business rows
- Handles empty state when no data exists

The page route at `routes/admin/analytics.tsx` (new) renders the AdminAnalytics island.

### Relevant Files
- `routes/api/admin/analytics.ts` — New API handler
- `islands/AdminAnalytics.tsx` — New admin island
- `routes/admin/analytics.tsx` — New page route
- `lib/analytics.ts` — Analytics key builders
- `lib/coupon.ts` — Coupon type
- `components/ui/card.tsx` — UI card component for summary cards

### Dependent Files
- (none — self-contained admin module)

### Related ADRs
- ADR-003: Analytics Counters in Dedicated KV Prefix

## Deliverables

- `GET /api/admin/analytics` API handler with aggregate metrics
- AdminAnalytics island with summary cards and per-business breakdown
- `/admin/analytics` page route
- Integration tests with 80%+ coverage

## Tests

- Integration tests:
  - [ ] GET `/api/admin/analytics` returns correct aggregate metrics
  - [ ] GET returns per-business breakdown with correct counts
  - [ ] GET with no coupons returns zeros (not errors)
  - [ ] Unauthorized (non-admin) returns 403
- Component tests:
  - [ ] Summary cards display correct aggregate values
  - [ ] Per-business table renders all businesses with their metrics
  - [ ] Empty state displays when no data exists
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Admins can view system-wide coupon analytics
- Per-business breakdown is accurate and sortable
- Summary cards show aggregate metrics clearly
