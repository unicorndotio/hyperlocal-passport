---
status: pending
title: Seed realignment — `crypto.randomUUID()` replacing hardcoded IDs
type: refactor
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 04: Seed realignment — `crypto.randomUUID()` replacing hardcoded IDs

## Overview

Replace all hardcoded string IDs in `seed.ts` (like `'seed-biz-central-cafe'`,
`'demo-coupon-10off'`, `'seed-redemption-r1'`) with `crypto.randomUUID()` calls
so that the seed data is consistent with the new `uuid` PK convention. FK
references between seed entities are maintained by storing generated UUIDs in
local variables, keeping the data flow deterministic within the seed function
scope.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- All hardcoded string IDs in `seed.ts` MUST be replaced with `crypto.randomUUID()`
- FK relationships between seed entities MUST be preserved via local variable references
- The `signUpOrGetUser` function MUST remain unchanged (Better Auth manages user IDs)
- The `upsert*` helper functions MAY be simplified — `onConflictDoNothing` can stay, but manual ID generation in callers must change
- `createdAt`, `updatedAt`, and other timestamp values MUST remain unchanged (timezone is handled by the DB layer)
- The `REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events` call at the end MUST remain
- After the change, `deno task db:seed` MUST produce the same number of entities as before
</requirements>

## Subtasks

- [ ] 04.1 Replace business IDs: `'seed-biz-central-cafe'` → `crypto.randomUUID()`, store in variable; same for `'seed-biz-central-livros'`
- [ ] 04.2 Replace coupon IDs: `'demo-coupon-10off'`, `'demo-coupon-fixo5'`, `'demo-coupon-cafe-bogo'`, `'demo-coupon-livro-20off'`
- [ ] 04.3 Replace merchant post IDs: `'seed-post-cafe-festival'`, `'seed-post-livraria-lancamento'`, `'seed-post-cafe-novidades'`, `'seed-post-livraria-clube'`, `'seed-post-cafe-draft'`
- [ ] 04.4 Replace redemption IDs: `'seed-redemption-r1'`, `'seed-redemption-r2'`, `'seed-redemption-r3'`, `'seed-redemption-active'`
- [ ] 04.5 Replace transaction IDs: `'seed-tx-1'`, `'seed-tx-2'`, `'seed-tx-3'`
- [ ] 04.6 Replace coupon analytics IDs — already use `crypto.randomUUID()`, verify no hardcoded values
- [ ] 04.7 Remove `id` parameter from `upsertCoupon` return value and all callers (return type not needed when IDs are auto-generated)
- [ ] 04.8 Run `deno task db:seed` and verify output matches expected entity counts

## Implementation Details

The pattern for each entity is:
```ts
// Before:
const bizId = 'seed-biz-central-cafe'
await upsertBusiness({ id: bizId, userId: businessUserId, name: 'Café Central', ... })

// After:
const bizId = crypto.randomUUID()
await db.insert(schema.businesses).values({
  id: bizId,
  userId: businessUserId,
  name: 'Café Central',
  ...
})
```

The `upsert*` helper functions pass through to `db.insert().onConflictDoNothing()`.
Since UUIDs are generated via `crypto.randomUUID()`, collisions are effectively
impossible, so `onConflictDoNothing` is a safety net rather than expected behavior.

The seed creates a cross-referenced data graph: businesses → coupons →
redemptions → transactions. Each arrow requires the parent's ID to be stored
in a local variable before the child is created. This pattern is preserved.

The `upsertCoupon` function currently returns `values.id` — after the change,
the return is no longer used since the caller generates and keeps the ID.
The function return type can be changed to `Promise<void>`.

### Relevant Files
- `seed.ts` — Entire file needs ID realignment; ~30 hardcoded string IDs to replace
- `db/schema.ts` — Imported by seed.ts for table references; already updated by Tasks 01-03

### Dependent Files
- No files depend on seed.ts (it is a standalone script)
- Tests that rely on seed data may need to re-seed after schema changes, but test logic itself is unaffected

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F5: Seed data realignment)

## Deliverables

- All hardcoded string IDs replaced with `crypto.randomUUID()`
- Seed runs successfully (`deno task db:seed`)
- 2 businesses, 4 coupons, 5 merchant posts, 4 redemptions, 3 transactions created (same counts as before)
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for seed data consistency **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `crypto.randomUUID()` returns valid UUID v4 format
- Integration tests:
  - [ ] Run seed on a fresh DB — all expected entities exist with correct FK relationships
  - [ ] Run seed twice — second run does not duplicate entities (onConflictDoNothing)
  - [ ] After seed, `REFRESH MATERIALIZED VIEW feed_events` produces expected row count
  - [ ] Resident savings query returns correct totals matching seed data
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- `deno task db:seed` completes with 0 errors
- Entity counts match pre-change: 6 users, 2 businesses, 4 coupons, 5 posts, 4 redemptions, 3 transactions, 4 analytics
- All FK references between seed entities are valid
- `deno task test` passes
