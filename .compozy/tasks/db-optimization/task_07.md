---
status: pending
title: Test DB utility — `lib/test-db.ts` with `useDatabase()`
type: backend
complexity: medium
dependencies: []
---

# Task 07: Test DB utility — `lib/test-db.ts` with `useDatabase()`

## Overview

Create `lib/test-db.ts` exporting a `useDatabase()` function that eliminates
boilerplate duplicated across ~40 test files. It applies the PG_CONNECTION
environment guard, sets `sanitizeOps: false` and `sanitizeResources: false`,
and provides a `cleanupDatabase()` helper that truncates all app tables in
FK-safe order. This is an additive utility — existing test files can migrate
incrementally.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `useDatabase()` MUST wrap Deno.test configuration — applying PG_CONNECTION skip guard + sanitize flags
- `useDatabase()` MUST accept test name, function, and optional config (matching `Deno.test` signature)
- `cleanupDatabase()` MUST truncate all app tables in FK-safe order (respecting cascade dependencies)
- The utility MUST NOT create a new pool — it reuses the existing singleton from `lib/db.ts`
- The utility MUST export nothing else unless explicitly justified
- The `db` export from `lib/db.ts` MUST remain the primary way to access the database (test utility only configures the test lifecycle)
- No existing test file must break — the utility is additive

## Subtasks

- [ ] 07.1 Create `lib/test-db.ts` with `useDatabase()` wrapper
- [ ] 07.2 Implement PG_CONNECTION guard — skip test when env var is not set, with a console.info message
- [ ] 07.3 Apply `sanitizeOps: false, sanitizeResources: false` automatically
- [ ] 07.4 Implement `cleanupDatabase()` — truncate app tables in dependency order
- [ ] 07.5 Write unit tests for the test utility itself
- [ ] 07.6 Migrate one existing test file to use `useDatabase()` as a proof of pattern

## Implementation Details

The `useDatabase()` API:

```ts
// lib/test-db.ts
import { db } from './db.ts'
import * as schema from '../db/schema.ts'

type TestFunction = (t: Deno.TestContext) => void | Promise<void>

interface TestOptions {
  name: string
  fn: TestFunction
  sanitizeOps?: boolean
  sanitizeResources?: boolean
  // any other Deno.Test options passed through
}

export function useDatabase(): void {
  // This function configures a before-all hook if needed.
  // Currently no-op — pool is global singleton.
  // Future: could set up test-level transactions or DB snapshots.
}

export function cleanupDatabase(): Promise<void> {
  // Truncate in dependency order to avoid FK violations:
  // 1. transactions, signals, coupon_analytics (leaf tables)
  // 2. redemptions, merchant_posts, file_metadata
  // 3. coupons, businesses
  // Use TRUNCATE ... CASCADE or manual ordering
  const tables = [
    schema.transactions,
    schema.signals,
    schema.couponAnalytics,
    schema.redemptions,
    schema.merchantPosts,
    schema.fileMetadata,
    schema.coupons,
    schema.businesses,
  ]
  // Execute TRUNCATE for each table
}
```

For usage in tests:

```ts
// Before:
if (Deno.env.get('PG_CONNECTION')) {
  Deno.test({
    name: 'My test',
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => { ... },
  })
} else {
  Deno.test({ name: '... - Skipped', fn: () => { console.info('skipped') } })
}

// After:
import { useDatabase } from '../lib/test-db.ts'
useDatabase()

Deno.test({
  name: 'My test',  // sanitize flags auto-added
  fn: async () => { ... },
})
```

`cleanupDatabase()` is opt-in — test files that manage their own data cleanup
can continue using manual `finally` blocks. The helper exists for tests that
want simpler teardown.

### Relevant Files
- `lib/test-db.ts` — New file to create
- `lib/db.ts` — Exports the `db` singleton and `closeConnection` that test-db.ts reuses
- `tests/savings_api.test.ts` — Representative of the boilerplate pattern to eliminate

### Dependent Files
- `tests/*.test.ts` — ~40 test files that can optionally adopt the utility
- No runtime files depend on this utility

### Related ADRs
- ADR-005: Test DB utility with useDatabase() hooks

## Deliverables

- `lib/test-db.ts` created with `useDatabase()` and `cleanupDatabase()`
- At least one existing test file migrated to use `useDatabase()` as proof of pattern
- Unit tests for the test utility itself
- All existing tests still pass
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `useDatabase()` does not throw when PG_CONNECTION is set
  - [ ] `useDatabase()` produces a skip message when PG_CONNECTION is not set
  - [ ] `cleanupDatabase()` truncates all app tables without FK errors
- Integration tests:
  - [ ] Proof-of-pattern: one existing test file migrated to `useDatabase()` passes
  - [ ] After `cleanupDatabase()`, the affected tables are empty
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- `lib/test-db.ts` exists and exports `useDatabase()` and `cleanupDatabase()`
- Test utility passes its own tests
- At least one migrated test file works correctly
- All pre-existing tests pass
- No breakage in any existing test
