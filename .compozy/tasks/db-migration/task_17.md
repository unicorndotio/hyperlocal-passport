---
status: completed
title: Migrate Remaining Test Files to Drizzle and passport_test Database
type: test
complexity: high
dependencies:
    - task_02
    - task_03
    - task_04
    - task_15
    - task_16
---

# Migrate Remaining Test Files to Drizzle and passport_test Database

## Overview

Nine test files still use `Deno.openKv()` or `lib/kv.ts` to seed and verify test data. These tests cannot run against the current PostgreSQL-backed codebase and are the final blocker before `lib/kv.ts` and `lib/kv-adapter.ts` can be deleted (task_14). Each test file must be rewritten to seed data via Drizzle inserts into the `passport_test` database and verify outcomes with Drizzle queries, following the per-file TRUNCATE cleanup strategy defined in the TechSpec (ADR-006).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC "Testing Approach" section and ADR-006 for the exact test strategy
- Each test file MUST use `PG_CONNECTION_TEST` env var (not `PG_CONNECTION`) to connect to `passport_test` database
- Each test file MUST `await db.delete(schema.tableX)` at the start to clean up data from previous runs (not at the end — a crashed test would skip cleanup)
- `Deno.openKv(':memory:')` and `Deno.openKv()` calls MUST be removed from ALL test files
- KV-specific assertions (e.g., `kv.get(['user', id])`) MUST be replaced with Drizzle selects against PostgreSQL
- `viewCountKey`, `redemptionCountKey`, `validationCountKey` helpers from `lib/analytics.ts` are KV-specific — tests using them must be rewritten to query `coupon_analytics` table instead
- TESTS REQUIRED — verified by running `deno test -A --env=PG_CONNECTION_TEST=...` on all migrated files
</critical>

<requirements>
1. ALL nine test files MUST remove any `import { kv } from '../lib/kv.ts'` or `import { kv } from '../../../../../lib/kv.ts'` lines.
2. ALL nine test files MUST add `import { db } from '../lib/db.ts'` and `import * as schema from '../db/schema.ts'` (with appropriate relative paths).
3. Each test file MUST run cleanup at the **start** of each top-level `Deno.test` using `db.delete()` on the tables it uses (per TechSpec ADR-006).
4. `tests/admin_approvals.test.ts` MUST replace `kv.set(['user', userId], user)` with `db.insert(schema.users).values(...)` and `kv.set(['approvals', 'pending', userId], ...)` with appropriate database state; approval verification MUST use `db.select().from(schema.users).where(eq(schema.users.id, userId))`.
5. `tests/analytics_api.test.ts` MUST replace `kv.set(['businesses', ...], ...)` and `kv.set(['coupons', ...], ...)` with Drizzle inserts; analytics counter setup via `kv.atomic().sum(viewCountKey(...), N)` MUST be replaced with `db.insert(schema.couponAnalytics).values({ couponId, views: N, ... })` or `db.update(schema.couponAnalytics).set({ views: N }).where(...)`.
6. `tests/business_detail_page.test.ts` MUST replace `kv.set(['coupons', ...], ...)` and `kv.get<Deno.KvU64>(viewCountKey(...))` with Drizzle inserts and `db.select().from(schema.couponAnalytics)` queries respectively.
7. `tests/business_onboarding.test.ts` MUST remove `const kvTest = await Deno.openKv(':memory:')` and replace test data setup with Drizzle inserts.
8. `tests/register.test.ts` MUST replace all `kv.set/delete/get` calls with Drizzle inserts/deletes/selects on `schema.users`.
9. `tests/routes/api/admin/businesses/toggle_test.ts` MUST replace `kv.set(['businesses', ...])`, `kv.delete(['businesses', ...])`, and `kv.get(['businesses', ...])` with Drizzle inserts, deletes, and selects on `schema.businesses`.
10. `tests/business_admin_ui.test.ts`, `tests/mobile_catalog_integration.test.ts`, and `tests/islands/coupon_manager.test.ts` MUST have all KV references removed and replaced with equivalent Drizzle interactions.
11. `deno test -A` on all nine files MUST pass with zero failures.
</requirements>

## Subtasks

- [ ] Rewrite `tests/admin_approvals.test.ts`: replace KV seed/verify with Drizzle inserts/selects on `users` table
- [ ] Rewrite `tests/analytics_api.test.ts`: replace KV business/coupon/counter setup with Drizzle inserts; replace `viewCountKey`/`redemptionCountKey`/`validationCountKey` with `coupon_analytics` table queries
- [ ] Rewrite `tests/business_detail_page.test.ts`: replace KV coupon seed and `kv.get<KvU64>(viewCountKey(...))` with Drizzle inserts and `coupon_analytics` selects
- [ ] Rewrite `tests/business_onboarding.test.ts`: remove `Deno.openKv(':memory:')` and KV test data setup; replace with Drizzle inserts into `passport_test`
- [ ] Rewrite `tests/register.test.ts`: replace all KV seed/verify/cleanup with Drizzle inserts/selects/deletes on `users` table
- [ ] Rewrite `tests/routes/api/admin/businesses/toggle_test.ts`: replace `kv.set/delete/get` business helpers with Drizzle CRUD on `businesses` table
- [ ] Rewrite `tests/business_admin_ui.test.ts`: remove all KV references; update data setup to use Drizzle
- [ ] Rewrite `tests/mobile_catalog_integration.test.ts`: remove all KV references; update data setup to use Drizzle
- [ ] Rewrite `tests/islands/coupon_manager.test.ts`: remove all KV references; update data setup to use Drizzle
- [ ] Run `deno test -A` on each file individually and verify all steps pass

## Implementation Details

The test strategy (ADR-006) is: dedicated `passport_test` database, per-file cleanup at the **beginning** of each `Deno.test` using `db.delete()`. Example pattern:

```ts
import { db } from '../lib/db.ts'
import * as schema from '../db/schema.ts'
import { eq } from 'drizzle-orm'

Deno.test('My test', async (t) => {
  // cleanup at start (not end — a crashed test would skip end-cleanup)
  await db.delete(schema.users)
  await db.delete(schema.businesses)

  await t.step('does something', async () => {
    await db.insert(schema.businesses).values({ id: 'biz-1', ... })
    const res = await myHandler(...)
    const stored = await db.select().from(schema.businesses).where(eq(schema.businesses.id, 'biz-1'))
    assertEquals(stored[0].isActive, false)
  })
})
```

For analytics counter tests: instead of `kv.atomic().sum(viewCountKey(couponId), 100n)`, use:
```ts
await db.insert(schema.couponAnalytics).values({ id: crypto.randomUUID(), couponId, views: 100, redemptions: 30, validations: 20 })
```

### Relevant Files

- `tests/admin_approvals.test.ts` — uses KV for user + approval seed/verify
- `tests/analytics_api.test.ts` — uses KV for business/coupon seed; uses `viewCountKey`/`redemptionCountKey`/`validationCountKey`
- `tests/business_admin_ui.test.ts` — uses KV (grep reveals KV imports)
- `tests/business_detail_page.test.ts` — uses KV for coupon seed and view counter assertions
- `tests/business_onboarding.test.ts` — uses `Deno.openKv(':memory:')` for isolation
- `tests/mobile_catalog_integration.test.ts` — uses KV for business catalog seed
- `tests/register.test.ts` — heavy KV usage for user registration verification
- `tests/islands/coupon_manager.test.ts` — uses KV for coupon/business seed
- `tests/routes/api/admin/businesses/toggle_test.ts` — uses KV for business seed/verify
- `lib/db.ts` — Drizzle client to import in tests
- `db/schema.ts` — schema definitions for all Drizzle inserts/selects

### Dependent Files

- `lib/kv.ts` — blocked from deletion until all test files have zero KV references (resolved by task_14)
- `lib/kv-adapter.ts` — blocked from deletion until all test files have zero KV references (resolved by task_14)
- `lib/analytics.ts` — `viewCountKey`, `redemptionCountKey`, `validationCountKey` exports are KV-specific; tests must stop importing them

### Related ADRs

- [ADR-006: Test Database Strategy — Dedicated Test Database](../adrs/adr-006.md)
- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- All nine test files rewritten to use Drizzle and `passport_test` database; no KV imports remain in any test file
- Per-file cleanup using `db.delete()` at the start of each top-level `Deno.test`
- All test scenarios preserved with equivalent assertions against PostgreSQL data
- `deno test -A` on all nine files exits 0 with all test steps passing
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for each API/page route covered by the test files **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Each migrated test file imports compile without TypeScript errors (`deno check tests/X.test.ts`)
- Integration tests:
  - [ ] `tests/admin_approvals.test.ts`: GET pending approvals returns user seeded via Drizzle; POST approve updates `users.status` in PostgreSQL; POST reject updates `users.status`; 404 for non-existent user
  - [ ] `tests/analytics_api.test.ts`: returns correct view/redemption/validation counts seeded via `coupon_analytics` Drizzle inserts; returns 403 for non-owner business; admin can access any business analytics
  - [ ] `tests/business_detail_page.test.ts`: coupon view count increments in `coupon_analytics` table; business detail page returns 404 for unknown id
  - [ ] `tests/business_onboarding.test.ts`: PUT /profile sets `hasSeenMerchantOnboarding = true` in PostgreSQL `businesses` table
  - [ ] `tests/register.test.ts`: POST /register creates user in `users` table; duplicate CPF returns 409; duplicate email returns 409; all existing test cases preserved
  - [ ] `tests/routes/api/admin/businesses/toggle_test.ts`: PUT toggle flips `businesses.isActive` in PostgreSQL; 404 for non-existent business
  - [ ] `tests/business_admin_ui.test.ts`: all existing test cases pass against PostgreSQL data
  - [ ] `tests/mobile_catalog_integration.test.ts`: catalog returns only active businesses seeded via Drizzle
  - [ ] `tests/islands/coupon_manager.test.ts`: coupon creation/deletion reflected in PostgreSQL
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero KV references in any test file (`grep -r "Deno.openKv\|from.*lib/kv" tests/` returns zero results)
- `deno test -A` exits 0 with 100% pass rate
- `lib/kv.ts` and `lib/kv-adapter.ts` can now safely be deleted (task_14 unblocked)
