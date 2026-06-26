---
status: completed
title: Analytics API + Dashboard Island
type: backend
complexity: high
dependencies:
    - task_03
    - task_04
    - task_05
---

# Task 08: Analytics API + Dashboard Island

## Overview

Implement the `GET /api/businesses/[id]/analytics` endpoint that returns per-coupon funnel data (views, redemptions, validations counts plus transaction history), and build the AnalyticsDashboard island component that visualizes this data. This gives businesses visibility into coupon performance and ROI.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `GET /api/businesses/[id]/analytics` MUST return an array of per-coupon analytics objects, each containing: couponId, couponTitle, views, redemptions, validations, and recent transactions
- The API MUST read counters from `['analytics', couponId, 'views'|'redemptions'|'validations']` keys
- The API MUST include a list of recent transactions with pagination support
- The AnalyticsDashboard island MUST display a funnel visualization for each coupon (views → redemptions → validations)
- The dashboard MUST show a transaction history table with columns: date, coupon, user, amount, discount, final
- The dashboard MUST handle empty states (no data yet) with helpful messaging
- The dashboard MUST be placed at a new `/business/analytics` page route
- All text MUST be in English per project convention

## Subtasks

- [ ] 8.1 Implement `GET /api/businesses/[id]/analytics` handler that reads analytics counters and transactions
- [ ] 8.2 Build the AnalyticsDashboard island with funnel visualization for each coupon
- [ ] 8.3 Build the transaction history table with pagination
- [ ] 8.4 Add empty state handling for coupons with no data yet
- [ ] 8.5 Create `/business/analytics` page route that renders the AnalyticsDashboard island
- [ ] 8.6 Write API integration tests

## Implementation Details

The API handler at `routes/api/businesses/[id]/analytics.ts` (new file):
1. Verifies the authenticated user owns the business (or is admin)
2. Lists all coupons for the business
3. For each coupon, reads analytics counters from `['analytics', couponId, 'views'|'redemptions'|'validations']`
4. Reads recent transactions from `['business_transactions', businessId, ...]` prefix
5. Returns aggregated response

The AnalyticsDashboard island at `islands/AnalyticsDashboard.tsx` (new):
- Fetches data from the analytics API on mount
- Displays a summary card at the top (total views, redemptions, validations, conversion rate)
- Shows per-coupon rows with a funnel bar visualization
- Below the funnel, a paginated transaction history table
- Empty state when no transactions exist yet

The page route at `routes/business/analytics.tsx` (new) renders the AnalyticsDashboard island, wrapped in a layout with business access control.

See TechSpec "Component Overview" section for AnalyticsDashboard responsibility. Reference ADR-002 for the dashboard layout decision.

### Relevant Files
- `routes/api/businesses/[id]/analytics.ts` — New API handler
- `islands/AnalyticsDashboard.tsx` — New dashboard island
- `routes/business/analytics.tsx` — New page route
- `lib/analytics.ts` — Analytics key builders
- `lib/coupon.ts` — Transaction type
- `components/ui/card.tsx` — UI card component for summary cards

### Dependent Files
- `components/BusinessHeader.tsx` — Needs analytics tab link (task 09)

### Related ADRs
- ADR-002: Business Dashboard Layout — Cohesive Redesign with Dedicated Analytics Tab
- ADR-003: Analytics Counters in Dedicated KV Prefix

## Deliverables

- `GET /api/businesses/[id]/analytics` API handler
- AnalyticsDashboard island with funnel visualization and transaction history
- `/business/analytics` page route
- Integration tests for the analytics API
- Component tests for the island with 80%+ coverage

## Tests

- Integration tests:
  - [ ] GET `/api/businesses/[id]/analytics` returns per-coupon funnel data with correct counter values
  - [ ] GET returns empty counters for coupons with no views/redemptions
  - [ ] GET includes transaction history with pagination
  - [ ] Unauthorized access returns 401
  - [ ] Non-owner returns 403
  - [ ] Analytics for business with no coupons returns empty array
- Component tests:
  - [ ] Dashboard renders summary cards with correct totals
  - [ ] Per-coupon funnel bars display correct relative proportions
  - [ ] Transaction history table renders with pagination
  - [ ] Empty state displays when no transactions exist
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Businesses can view per-coupon analytics funnel
- Transaction history is paginated and filterable
- Empty states are informative
