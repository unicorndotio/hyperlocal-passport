---
status: completed
title: Migrate Resident-Facing Page Routes to Drizzle
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Migrate Resident-Facing Page Routes to Drizzle

## Overview

Two resident-facing page routes — `routes/catalog.tsx` and `routes/passaporte.tsx` — still import from `lib/kv.ts` and use `kv.list` and `kv.get` for their data access. These are the entry-point pages for all residents and are currently broken in the Docker environment because `Deno.openKv` is no longer available. Both must be rewritten to use Drizzle queries against PostgreSQL.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC "API Endpoints" section for KV→Drizzle mapping patterns
- `routes/catalog.tsx` uses `kv.list({ prefix: ['businesses'] })` — replace with `db.select().from(businesses).where(eq(businesses.isActive, true))`
- `routes/passaporte.tsx` uses `kv.list({ prefix: ['user_redemptions', userId] })` — replace with `db.select().from(redemptions).where(eq(redemptions.userId, userId))` with status filter
- Both pages must remove their `kv` imports and rely solely on `db` from `lib/db.ts`
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `routes/catalog.tsx` MUST replace `kv.list<Business>({ prefix: ['businesses'] })` with a Drizzle `db.select().from(businesses).where(eq(businesses.isActive, true))` call.
2. `routes/catalog.tsx` MUST remove the `import { kv } from '../lib/kv.ts'` line and add `import { db } from '../lib/db.ts'` and the necessary schema imports.
3. `routes/passaporte.tsx` MUST replace `kv.list<Redemption>({ prefix: ['user_redemptions', userId] })` with a Drizzle query that joins `redemptions` to the `businesses` table to retrieve `businessName` in a single query (or uses a follow-up query — see TechSpec).
4. `routes/passaporte.tsx` MUST filter redemptions by `status = 'active'` using a Drizzle `where` clause, not an in-memory `if` check.
5. `routes/passaporte.tsx` MUST remove the `import { kv } from '../lib/kv.ts'` line and add Drizzle imports.
6. Category filtering in `routes/catalog.tsx` MAY remain as in-memory filtering or be moved to a Drizzle `where` clause; either is acceptable.
7. `deno check` on both files MUST pass with zero TypeScript errors after changes.
</requirements>

## Subtasks

- [ ] Update `routes/catalog.tsx`: replace `kv.list` with `db.select().from(businesses)`, apply `isActive` filter
- [ ] Update `routes/catalog.tsx`: remove `kv` import, add `db` and schema imports
- [ ] Update `routes/passaporte.tsx`: replace `kv.list` for redemptions with Drizzle query using `userId` filter
- [ ] Update `routes/passaporte.tsx`: replace `kv.get<Business>` with a join or secondary Drizzle query for business names
- [ ] Update `routes/passaporte.tsx`: remove `kv` import, add `db` and schema imports
- [ ] Run `deno check routes/catalog.tsx` and `deno check routes/passaporte.tsx` and verify zero errors

## Implementation Details

Both files use the same pattern: top-level KV imports at line 3-4, then KV iteration in a GET handler. Replace with Drizzle's fluent query API. See TechSpec "API Endpoints" section for mapping patterns (`kv.list → db.select()`, `kv.get → db.select().where(eq(...))`).

For `passaporte.tsx`, the `businessMap` pattern (building a Map of businessId → businessName via repeated `kv.get` calls) can be replaced with a single Drizzle join on `redemptions ↔ businesses` or a batched `db.select().from(businesses).where(inArray(businesses.id, [...businessIds]))`.

### Relevant Files

- `routes/catalog.tsx` — replace KV `list` with Drizzle select + active filter
- `routes/passaporte.tsx` — replace KV `list` and `get` with Drizzle queries; remove `businessMap` loop pattern
- `lib/db.ts` — existing Drizzle client singleton to import
- `db/schema.ts` — `businesses` and `redemptions` table definitions

### Dependent Files

- `tests/mobile_catalog_integration.test.ts` — tests catalog page rendering; must be updated in task_17

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- `routes/catalog.tsx` rewritten to use Drizzle; no KV imports remain
- `routes/passaporte.tsx` rewritten to use Drizzle; no KV imports remain
- `deno check` passes on both files
- Integration tests for both routes added/updated
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for catalog and passaporte routes **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `deno check routes/catalog.tsx` exits 0 (zero type errors)
  - [ ] `deno check routes/passaporte.tsx` exits 0 (zero type errors)
- Integration tests:
  - [ ] GET /catalog returns only businesses with `isActive = true` in Drizzle
  - [ ] GET /catalog with `?category=food` returns only businesses in that category
  - [ ] GET /catalog with no active businesses returns an empty list without errors
  - [ ] GET /passaporte for authenticated user with active redemptions returns correct `businessName` from `businesses` table
  - [ ] GET /passaporte for authenticated user with no active redemptions returns empty array
  - [ ] GET /passaporte for unauthenticated user redirects to `/login`
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero KV references remain in `routes/catalog.tsx` and `routes/passaporte.tsx`
- `deno check` passes on both route files
- `/catalog` page loads correctly in the running Docker application
- `/passaporte` page loads correctly for authenticated residents
