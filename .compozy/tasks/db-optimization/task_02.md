---
status: pending
title: FK hardening — explicit `onDelete` on all 15 FKs + missing FK
type: refactor
complexity: high
dependencies:
  - task_01
---

# Task 02: FK hardening — explicit `onDelete` on all 15 FKs + missing FK

## Overview

Add explicit `onDelete` actions to every foreign key in the schema to
establish a documented, predictable referential integrity policy. This
includes adding the entirely missing FK on `file_metadata.user_id → users.id`.
Three FKs (session, account, coupon_analytics) already have `onDelete: 'cascade'`
and must be verified. The remaining 11 FKs either have no explicit `onDelete`
(defaulting to `NO ACTION`) or are new.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Every `.references()` call MUST include explicit `onDelete`
- Ownership chain FKs MUST use `onDelete: 'cascade'`: businesses→users, coupons→businesses, redemptions→coupons/businesses/users, merchant_posts→businesses, coupon_analytics→coupons, session→users, account→users
- Audit record FKs MUST use `onDelete: 'restrict'`: all 4 transactions FKs, signals→users
- `file_metadata.user_id → users.id` MUST be added with `onDelete: 'cascade'` — this FK does not currently exist
- Existing FKs on `session.user_id`, `account.user_id`, `coupon_analytics.coupon_id` already have `cascade` — MUST be verified
- `merchant_posts.business_id` MUST be updated — its FK is `references`, already active for the PK type from Task 01 on the FK foreign side
</requirements>

## Subtasks

- [ ] 02.1 Add FK on `file_metadata.user_id → users.id` with `onDelete: 'cascade'`
- [ ] 02.2 Update `businesses.user_id → users.id` — add `onDelete: 'cascade'`
- [ ] 02.3 Update `coupons.business_id → businesses.id` — add `onDelete: 'cascade'`
- [ ] 02.4 Update `redemptions.coupon_id → coupons.id`, `business_id → businesses.id`, `user_id → users.id` — all `onDelete: 'cascade'`
- [ ] 02.5 Update all 4 `transactions` FKs — add `onDelete: 'restrict'`
- [ ] 02.6 Update `signals.user_id → users.id` — add `onDelete: 'restrict'`
- [ ] 02.7 Update `merchant_posts.business_id → businesses.id` — add `onDelete: 'cascade'`
- [ ] 02.8 Verify existing `cascade` FKs on `session`, `account`, `coupon_analytics`
- [ ] 02.9 Run `deno task test` and fix any test failures from FK enforcement

## Implementation Details

Each `.references()` call in `db/schema.ts` needs the second argument
`{ onDelete: 'cascade' }` or `{ onDelete: 'restrict' }`. The strategy is:

- **Cascade** for ownership chains: deleting a parent removes its owned children
- **Restrict** for audit records: prevents deletion of a parent that has audit
  trail records, forcing explicit cleanup if needed

The `file_metadata.user_id` column is nullable (`text('user_id')` without
`notNull()`). Adding `.references(() => users.id, { onDelete: 'cascade' })`
means: when `user_id` is non-null and the referenced user is deleted, the
file_metadata row is also deleted. Null `user_id` values are unaffected
(cascade only fires for non-null FK values).

### Relevant Files
- `db/schema.ts` — All FK definitions live in table bodies; 15 total, 11 need updates, 1 needs creation, 3 need verification

### Dependent Files
- `seed.ts` — The seed script currently manually orders deletes to work around missing cascades. After this task, cascade handles ordering automatically.
- `tests/*.test.ts` — Test cleanup in `finally` blocks may be simplified (some deletes become unnecessary due to cascade)
- `lib/feed.ts`, `lib/analytics.ts` — No direct dependency on onDelete values

### Related ADRs
- ADR-001: Schema Reliability Standardization — scope and approach (F2: Referential integrity hardening)
- ADR-002: Big Bang execution strategy (Layer 1: Foundation)

## Deliverables

- All 15 FKs have explicit `onDelete` — 12 cascade, 3 restrict
- `file_metadata.user_id` FK added (was missing)
- `deno task test` passes
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for cascade/restrict behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] Drizzle schema compiles — all `.references()` calls include second argument
- Integration tests:
  - [ ] Cascade: delete a user → all owned businesses, coupons, redemptions, merchant_posts, file_metadata are deleted
  - [ ] Cascade: delete a business → all owned coupons, redemptions, merchant_posts, coupon_analytics are deleted
  - [ ] Cascade: delete a coupon → all owned redemptions and coupon_analytics are deleted
  - [ ] Restrict: attempt to delete a user with transactions → error (restrict)
  - [ ] Restrict: attempt to delete a business with transactions → error (restrict)
  - [ ] Restrict: attempt to delete a user with signals → error (restrict)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- 15 FKs total, all with explicit onDelete
- `file_metadata.user_id` FK exists
- 12 cascade, 3 restrict
- Cascade deletes propagate correctly
- Restrict deletes block correctly with error
- All existing tests passing
