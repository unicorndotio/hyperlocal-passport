---
status: pending
title: Admin Routes Migration
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_04
---

# Admin Routes Migration

## Overview

Migrate all admin dashboard and management route handlers from Deno KV to Drizzle. This includes the analytics API (aggregating coupon views, redemptions, validations), user management, coupon management, and business toggle. The `lib/analytics.ts` helper module is rewritten to replace KV key builders with direct Drizzle query helpers on the `coupon_analytics` table.

<critical>

- Read the TechSpec ("Integration Points" section) and ADR-005 before implementing
- Reference ADR-005 for analytics table structure and query patterns
- Reference ADR-009 for view counter handling (atomic SQL increment, no event log)
- Admin routes are read-heavy except for business toggle and coupon CRUD
- Tests required: analytics aggregation, user listing, coupon CRUD, business activation toggle

</critical>

<requirements>

1. `lib/analytics.ts` MUST be rewritten: remove KV key helpers, add Drizzle query helpers that read from and write to the `coupon_analytics` table.
2. `routes/api/admin/analytics.ts` MUST query `coupon_analytics` for aggregate stats instead of reading individual KV counter keys.
3. `routes/api/admin/users.ts` MUST use Drizzle query instead of `Deno.openKv()` (the only file that opens its OWN KV connection).
4. `routes/api/admin/coupons/index.ts` MUST use Drizzle `select` with joins to list coupons with analytics data.
5. `routes/api/admin/coupons/[id].ts` MUST use Drizzle `update` and `delete` for coupon management.
6. `routes/api/admin/businesses/[id]/toggle.ts` MUST use Drizzle `update` to toggle business `isActive` status.
7. All `kv` imports MUST be removed from all admin route files and replaced with `db` and `schema` imports.

</requirements>

## Subtasks

- [ ] Rewrite `lib/analytics.ts`: replace KV key helpers with Drizzle query helpers
- [ ] Update `routes/api/admin/analytics.ts`: use Drizzle queries for analytics aggregation
- [ ] Update `routes/api/admin/users.ts`: replace Deno.openKv() with Drizzle query
- [ ] Update `routes/api/admin/coupons/index.ts`: replace KV prefix scan with Drizzle select
- [ ] Update `routes/api/admin/coupons/[id].ts`: replace KV CRUD with Drizzle queries
- [ ] Update `routes/api/admin/businesses/[id]/toggle.ts`: replace KV set with Drizzle update
- [ ] Remove `kv` imports from all files; add `db` and `schema` imports
- [ ] Verify `deno check` on all modified files
- [ ] Update admin API tests for PostgreSQL

## Implementation Details

### Relevant Files

- `lib/analytics.ts` — rewrite KV key helpers → Drizzle query helpers
- `routes/api/admin/analytics.ts`
- `routes/api/admin/users.ts`
- `routes/api/admin/coupons/index.ts`
- `routes/api/admin/coupons/[id].ts`
- `routes/api/admin/businesses/[id]/toggle.ts`
- `tests/admin_analytics_api.test.ts`
- `tests/admin_coupons_api.test.ts`
- `tests/admin_approvals_ui.test.ts`
- `tests/business_admin_ui.test.ts`

### Dependent Files

- `routes/admin/` page routes — consume these API endpoints (should work unchanged)
- All routes that call analytics helpers for counter updates

### Related ADRs

- [ADR-005: Analytics Counters Model — Dedicated Table with Event-Based Sources](../adrs/adr-005.md)
- [ADR-009: Coupon Views Tracking — Aggregated Counter Only for V1](../adrs/adr-009.md)

## Deliverables

- Updated `lib/analytics.ts` with Drizzle query helpers
- All 5 admin route files migrated from KV to Drizzle
- Admin API tests passing against PostgreSQL
- Analytics aggregation reads from `coupon_analytics` table

## Tests

### Unit Tests

- [ ] `deno check` on `lib/analytics.ts` and all 5 admin route files passes with zero errors

### Integration Tests

- [ ] GET admin/analytics returns view/redemption/validation counts aggregated from coupon_analytics
- [ ] GET admin/users returns list of all users
- [ ] GET admin/coupons/ returns coupons with analytics data
- [ ] PUT admin/coupons/[id] updates coupon fields
- [ ] DELETE admin/coupons/[id] removes coupon and cascades to analytics
- [ ] POST admin/businesses/[id]/toggle toggles isActive status
- [ ] View counter increment via business detail page is reflected in admin analytics
- [ ] Redemption and validation counters stay in sync with actual events

## Success Criteria

- All admin endpoints work against PostgreSQL
- Analytics counters correctly aggregate from coupon_analytics table
- `routes/api/admin/users.ts` no longer opens its own KV connection
- `deno check` on all modified files exits 0
- Test coverage >=80%
