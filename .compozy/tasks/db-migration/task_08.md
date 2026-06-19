---
status: pending
title: Coupon & Redemption Routes Migration
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_04
---

# Coupon & Redemption Routes Migration

## Overview

Migrate coupon CRUD, coupon lookup by code, and coupon redemption routes from Deno KV to Drizzle. This is the most concurrency-sensitive domain — redemption requires atomic check-and-increment logic (user monthly cap, global cap, analytics counter updates) all within a single Drizzle transaction. The redemption flow also replaces the KV `user_coupon_monthly_count` counter with a SQL `COUNT` query on the `redemptions` table.

<critical>

- Read the TechSpec ("API Endpoints" section), ADR-005, and ADR-008 before implementing
- Reference ADR-008 for replacing monthly count KV counter with SQL COUNT
- Reference ADR-005 for analytics counter updates within redemption transaction
- Redemption atomicity is critical — must handle concurrent requests correctly
- Tests required: redemption success, monthly cap enforcement, global cap, concurrent racing, analytics counter sync

</critical>

<requirements>

1. `routes/api/coupons/[id].ts` MUST replace `kv.get`, `kv.set` with Drizzle `select`, `insert`, `update`, `delete`.
2. `routes/api/coupons/[id]/redeem.ts` MUST replace the entire `kv.atomic()` block with a Drizzle `db.transaction()` containing: monthly cap check (SQL COUNT on redemptions), global cap check, redemption INSERT, analytics counter UPDATE, and user redemption index INSERT.
3. `routes/api/coupon-by-code/[code].ts` MUST replace `kv.get(['redemptions', code])` with `db.select().from(redemptions).where(eq(redemptions.id, code))`.
4. The monthly cap check MUST use `SELECT COUNT(*) FROM redemptions WHERE user_id = ? AND coupon_id = ? AND redeemed_at >= date_trunc('month', NOW())` within the transaction (per ADR-008).
5. The analytics counter in `redeem.ts` MUST be incremented atomically within the same transaction using `sql\`UPDATE coupon_analytics SET redemptions = redemptions + 1 WHERE coupon_id = ?\`` (per ADR-005).
6. All `kv` imports MUST be removed and replaced with `db` and `schema` imports.
7. The `lib/analytics.ts` helper functions (`redemptionCountKey`) are no longer needed for these routes — analytics are updated inline.

</requirements>

## Subtasks

- [ ] Update `routes/api/coupons/[id].ts`: replace KV CRUD with Drizzle queries
- [ ] Update `routes/api/coupons/[id]/redeem.ts`: replace atomic KV block with Drizzle transaction
- [ ] Update `routes/api/coupon-by-code/[code].ts`: replace KV get with Drizzle query
- [ ] Remove `kv` imports from all files; add `db` and `schema` imports
- [ ] Verify `deno check` on all 3 modified files
- [ ] Update coupon API tests for PostgreSQL
- [ ] Update coupon redeem API tests for PostgreSQL

## Implementation Details

### Relevant Files

- `routes/api/coupons/[id].ts`
- `routes/api/coupons/[id]/redeem.ts`
- `routes/api/coupon-by-code/[code].ts`
- `tests/coupon_api.test.ts`
- `tests/coupon_redeem_api.test.ts`
- `tests/coupon_engine.test.ts` (pure functions — no change needed, but verify)
- `tests/coupon_management_ui.test.ts`

### Dependent Files

- `lib/coupon-engine.ts` — referenced by redeem handler (unchanged, pure functions)
- `lib/coupon.ts` — referenced by coupon handlers (types unchanged)

### Related ADRs

- [ADR-005: Analytics Counters Model — Dedicated Table with Event-Based Sources](../adrs/adr-005.md)
- [ADR-008: User Coupon Usage — SQL COUNT from Redemptions Table](../adrs/adr-008.md)

## Deliverables

- All 3 coupon/redemption route files migrated from KV to Drizzle
- Redemption uses Drizzle transaction with serializable isolation
- Monthly cap enforced via SQL COUNT within transaction
- Analytics counter updated atomically within redemption transaction
- Coupon API tests passing against PostgreSQL

## Tests

### Unit Tests

- [ ] `deno check` on all 3 modified route files passes with zero errors

### Integration Tests

- [ ] GET coupons/[id] returns coupon data
- [ ] POST coupons/[id]/redeem with valid coupon creates redemption and decrements analytics
- [ ] POST coupons/[id]/redeem at monthly user cap (2/month) returns 400
- [ ] POST coupons/[id]/redeem at global cap returns 400
- [ ] POST coupons/[id]/redeem with expired coupon returns 400
- [ ] POST coupons/[id]/redeem with inactive coupon returns 400
- [ ] Two concurrent redemption requests for same coupon/user: one succeeds, one gets 409 (transaction serialization)
- [ ] Analytics row updated correctly after redemption (redemptions count incremented)
- [ ] GET coupon-by-code/[code] returns redemption data
- [ ] GET coupon-by-code/[code] with unknown code returns 404

## Success Criteria

- All coupon/redemption endpoints work against PostgreSQL
- Concurrent redemption racing is handled correctly (serializable isolation)
- Monthly cap enforced via SQL COUNT
- `deno check` on all modified files exits 0
- Test coverage >=80%
