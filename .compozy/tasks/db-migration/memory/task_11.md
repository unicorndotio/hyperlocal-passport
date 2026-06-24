# Task Memory: task_11.md

## Objective Snapshot

Migrate all 5 admin API route files + lib/analytics.ts from Deno KV to Drizzle. Update 2 test files. Also updated routes/business/[id].tsx to use new incrementViewCount helper since viewCountKey was removed.

## Important Decisions

- analytics.ts: Exported `getCouponAnalytics()` and `incrementViewCount()` instead of KV key helpers. Uses atomic SQL increment pattern from ADR-009/ADR-005.
- analytics.ts route: Single JOIN query (coupons LEFT JOIN businesses LEFT JOIN coupon_analytics) replaces 3 separate KV scans. Total discount cents uses COALESCE(SUM(...)) instead of iterating KV entries.
- users.ts: Direct Drizzle select projecting only needed fields (id, name, email, role, status) instead of adapter.findMany().
- coupons/index.ts: Dynamic WHERE clause approach using drizzle-orm conditions array, matching the original filter logic.
- coupons/[id].ts: Kept the same error handling pattern (404 before delete, 400 for invalid JSON/behavior).
- toggle.ts: Simplified from kv.atomic().check().set() to simple db.update().returning(). No optimistic concurrency needed with PostgreSQL.

## Learnings

- Drizzle `.insert().values([...])` with array requires all required (notNull) fields even in test helpers. The `makeBusiness` test helper needed `logoUrl`.
- Drizzle type inference for `.insert()` is strict — objects must match schema exactly.
- `db.delete().where(eq(...))` with cascade (onDelete: cascade) handles FK cleanup automatically.
- COALESCE in drizzle-orm requires `sql\`COALESCE(SUM(...), 0)\``

## Files / Surfaces

- lib/analytics.ts — rewritten
- routes/api/admin/analytics.ts — migrated
- routes/api/admin/users.ts — migrated
- routes/api/admin/coupons/index.ts — migrated
- routes/api/admin/coupons/[id].ts — migrated
- routes/api/admin/businesses/[id]/toggle.ts — migrated
- routes/business/[id].tsx — updated import (incrementViewCount)
- tests/admin_analytics_api.test.ts — migrated
- tests/admin_coupons_api.test.ts — migrated

## Errors / Corrections

- test makeBusiness() missing logoUrl caused TS2769 (required field). Added logoUrl.
- zsh glob expansion on paths with [id] brackets required quoting.

## Ready for Next Run

- All admin routes migrated. Tests updated. No KV imports remain in admin routes.
- routes/business/[id].tsx still uses KV for business/coupon data fetch — to be migrated in its own task.
- Several other routes (business/*.tsx, catalog.tsx, passaporte.tsx) still use KV — task 12+.
