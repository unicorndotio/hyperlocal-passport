---
status: completed
title: Migrate Business Page Routes to Drizzle
type: backend
complexity: high
dependencies:
  - task_02
  - task_03
  - task_04
---

# Migrate Business Page Routes to Drizzle

## Overview

Five business-facing page routes still import from `lib/kv.ts` and `lib/kv-adapter.ts` and use KV-backed adapter calls to look up the current business by `userId`. These pages — `[id].tsx`, `profile.tsx`, `analytics.tsx`, `coupons.tsx`, and `checkout.tsx` — crash at startup because `Deno.openKv` is unavailable. All five must replace `getDenoKvAdapterRaw(kv)` calls with direct Drizzle queries and remove all KV imports.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC "Integration Points" section for the KV adapter → Drizzle mapping patterns
- `getDenoKvAdapterRaw(kv).findOne<Business>({ model: 'businesses', where: [{ field: 'userId', value: userId }] })` MUST be replaced with `db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1)` (or equivalent)
- `routes/business/[id].tsx` uses both `kv.get<Business>` and `adapter.findMany<Coupon>` — both must be replaced with Drizzle queries
- `routes/business/[id].tsx` calls `incrementViewCount(coupon.id)` — verify this function is already using Drizzle after task_10 migration; if not, ensure the call still works
- All five files must have zero KV imports after this task
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `routes/business/[id].tsx` MUST replace `kv.get<Business>(['businesses', id])` with `db.select().from(businesses).where(eq(businesses.id, id)).limit(1)`.
2. `routes/business/[id].tsx` MUST replace `adapter.findMany<Coupon>(...)` with `db.select().from(coupons).where(and(eq(coupons.businessId, id), eq(coupons.isActive, true)))`.
3. `routes/business/profile.tsx` MUST replace `adapter.findOne<Business>(...)` with a Drizzle select filtering by `userId`.
4. `routes/business/analytics.tsx` MUST replace `adapter.findOne<Business>(...)` with a Drizzle select filtering by `userId`.
5. `routes/business/coupons.tsx` MUST replace `adapter.findOne<Business>` and `adapter.findMany<Coupon>` with Drizzle queries.
6. `routes/business/checkout.tsx` MUST replace `adapter.findOne<Business>(...)` with a Drizzle select filtering by `userId`.
7. ALL five files MUST remove `import { kv } from '@/lib/kv.ts'` and `import { getDenoKvAdapterRaw } from '@/lib/kv-adapter.ts'` lines.
8. ALL five files MUST add `import { db } from '@/lib/db.ts'` and the required schema/ORM imports.
9. `deno check` on all five files MUST pass with zero TypeScript errors.
</requirements>

## Subtasks

- [ ] Update `routes/business/[id].tsx`: replace `kv.get<Business>` with Drizzle select by id; replace `adapter.findMany<Coupon>` with Drizzle filtered select
- [ ] Update `routes/business/profile.tsx`: replace `adapter.findOne<Business>` with Drizzle select by `userId`; remove KV + adapter imports
- [ ] Update `routes/business/analytics.tsx`: replace `adapter.findOne<Business>` with Drizzle select by `userId`; remove KV + adapter imports
- [ ] Update `routes/business/coupons.tsx`: replace `adapter.findOne<Business>` and `adapter.findMany<Coupon>` with Drizzle selects; remove KV + adapter imports
- [ ] Update `routes/business/checkout.tsx`: replace `adapter.findOne<Business>` with Drizzle select by `userId`; remove KV + adapter imports
- [ ] Verify `lib/analytics.ts` `incrementViewCount()` is already on Drizzle (should be done in task_10); if not, fix in this task
- [ ] Run `deno check` on all five files and verify zero errors

## Implementation Details

All five files follow the same pattern: `const adapter = getDenoKvAdapterRaw(kv)` at module scope, then `adapter.findOne<Business>({ model: 'businesses', where: [{ field: 'userId', value: session.user.id }] })` in the page handler. Replace with:

```ts
import { db } from '@/lib/db.ts'
import * as schema from '@/db/schema.ts'
import { eq, and } from 'drizzle-orm'

// findOne<Business> by userId:
const [business] = await db.select().from(schema.businesses).where(eq(schema.businesses.userId, session.user.id)).limit(1)

// findMany<Coupon> by businessId + isActive:
const coupons = await db.select().from(schema.coupons).where(and(eq(schema.coupons.businessId, business.id), eq(schema.coupons.isActive, true)))
```

See TechSpec "Integration Points" and "API Endpoints" sections for patterns.

### Relevant Files

- `routes/business/[id].tsx` — KV `get` + adapter `findMany` → Drizzle selects
- `routes/business/profile.tsx` — adapter `findOne` → Drizzle select by userId
- `routes/business/analytics.tsx` — adapter `findOne` → Drizzle select by userId
- `routes/business/coupons.tsx` — adapter `findOne` + `findMany` → Drizzle selects
- `routes/business/checkout.tsx` — adapter `findOne` → Drizzle select by userId
- `lib/analytics.ts` — verify `incrementViewCount` already uses Drizzle (task_10 should have done this)
- `lib/db.ts` — Drizzle client singleton
- `db/schema.ts` — `businesses` and `coupons` table definitions

### Dependent Files

- `tests/business_admin_ui.test.ts` — tests business page rendering; migrated in task_17
- `tests/business_detail_page.test.ts` — tests business detail page; migrated in task_17
- `tests/islands/coupon_manager.test.ts` — tests coupon management island; migrated in task_17
- `lib/kv.ts` — can only be deleted once this task (and task_15/17) are complete (task_14)
- `lib/kv-adapter.ts` — can only be deleted once this task (and task_15/17) are complete (task_14)

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- All five business page routes rewritten with Drizzle queries; no KV or adapter imports remain in any of them
- Business detail page (`/business/[id]`) correctly displays business and its active coupons from PostgreSQL
- Business profile, analytics, coupons, and checkout pages correctly load current business from PostgreSQL by authenticated user's ID
- `deno check` passes on all five files
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for business page routes **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] `deno check routes/business/[id].tsx` exits 0
  - [ ] `deno check routes/business/profile.tsx` exits 0
  - [ ] `deno check routes/business/analytics.tsx` exits 0
  - [ ] `deno check routes/business/coupons.tsx` exits 0
  - [ ] `deno check routes/business/checkout.tsx` exits 0
- Integration tests:
  - [ ] GET `/business/:id` with valid business id returns 200 and renders business name from PostgreSQL
  - [ ] GET `/business/:id` with unknown id returns 404
  - [ ] GET `/business/:id` renders only coupons where `isActive = true`
  - [ ] GET `/business/profile` for authenticated business user returns correct business profile from PostgreSQL
  - [ ] GET `/business/profile` for unauthenticated user redirects to `/login`
  - [ ] GET `/business/profile` for user with no associated business returns access-restricted page
  - [ ] GET `/business/analytics` for authenticated business user returns 200
  - [ ] GET `/business/coupons` for authenticated business user returns all business coupons from PostgreSQL
  - [ ] GET `/business/checkout` for authenticated business user returns 200
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Zero KV or adapter references remain in all five business page routes
- `deno check` passes on all five files
- `/business/:id`, `/business/profile`, `/business/analytics`, `/business/coupons`, `/business/checkout` load correctly in the running Docker application
- Login as business user no longer triggers `TypeError: Deno.openKv is not a function`
