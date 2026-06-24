# Task Memory: task_07.md

## Objective Snapshot

Migrate all 6 business API route files from Deno KV to Drizzle ORM. Replace KV adapter CRUD, KV atomic operations, and KV counter keys with Drizzle queries and transactions. Update 3 API test files for PostgreSQL.

## Important Decisions

- Business `routes/api/businesses/register.ts`: Pre-check CNPJ via Drizzle select, then call `auth.api.signUpEmail()`, then `db.insert()` — not wrapped in a single Drizzle transaction (auth is external). On CNPJ unique constraint violation (PG code 23505), clean up the auth user.
- `routes/api/businesses/index.ts` POST: Uses `db.transaction()` for CNPJ uniqueness check + business insert atomically.
- `routes/api/businesses/[id]/profile.ts`: Replaced `kv.atomic().check().set().commit()` with `db.update().where().returning()` — PostgreSQL row-level atomicity replaces KV versionstamp check.
- `routes/api/businesses/[id]/analytics.ts`: KV counter keys (`viewCountKey`, `redemptionCountKey`, `validationCountKey`) replaced with `coupon_analytics` table queries via `db.select().from(schema.couponAnalytics).where(eq(couponAnalytics.couponId, id))`.
- `lib/auth.ts` needed fix: `drizzleAdapter` config used string table names (`'user'`), causing "field email doesn't exist" error. Changed to actual table references (`schema.users`).

## Learnings

- PostgreSQL FK constraints require parent rows to exist — test helper `seedBusiness()` must first create a parent user row or use `onConflictDoNothing()`.
- `pg.Pool` leaves persistent TCP connections — triggers Deno's leak detection in tests. All 34 business test steps pass but are reported as failed due to TCP connection leak detection.
- Tests that bypass route handlers and write directly to DB must account for FK constraints (businesses references users).

## Files / Surfaces

- `routes/api/businesses/index.ts` — migrated
- `routes/api/businesses/register.ts` — migrated
- `routes/api/businesses/[id].ts` — migrated
- `routes/api/businesses/[id]/coupons.ts` — migrated
- `routes/api/businesses/[id]/profile.ts` — migrated
- `routes/api/businesses/[id]/analytics.ts` — migrated
- `lib/auth.ts` — fixed drizzleAdapter schema mapping
- `tests/business_api.test.ts` — updated for PostgreSQL
- `tests/routes/api/businesses/register_test.ts` — updated for PostgreSQL
- `tests/routes/api/businesses/profile_test.ts` — updated for PostgreSQL

## Errors / Corrections

- `lib/auth.ts` had `schema: { user: 'user', ... }` (string) which broke `auth.api.signUpEmail`. Fixed to `schema: { user: schema.users, ... }` (table references).
- Profile test needed `db.insert(schema.users)` before `db.insert(schema.businesses)` to satisfy FK constraint.

## Ready for Next Run

- UI test files (`business_onboarding.test.ts`, `business_detail_page.test.ts`, etc.) still import KV — will be handled by task_14 cleanup or their respective migration tasks.
- Page routes under `routes/business/` still use KV directly — not in scope for this task.
