# Task Memory: task_15.md

## Objective Snapshot

Migrate routes/catalog.tsx and routes/passaporte.tsx from KV to Drizzle. Both now use `db` from `lib/db.ts` with zero KV imports. Tests rewritten to use Drizzle + shared PostgreSQL.

## Important Decisions

- passaporte.tsx uses a single Drizzle join (INNER JOIN businesses on redemptions.businessId) instead of the old N+1 kv.get pattern.
- catalog.tsx filters by `isActive = true` in SQL WHERE clause; category filtering stays in-memory.
- For passaporte redirect mock in tests: `Response.redirect()` requires absolute URL. Use `new Response(null, { status: 303, headers: { location } })` instead.

## Learnings

- Side-by-side reruns of catalog tests with non-unique IDs would collide in shared DB if cleanup fails. Random suffixes prevent this.
- The catalog handler's return type uses Fresh `page()` which returns `{ data: ... }`, not a Response. Passaporte returns either `{ data: ... }` or `Response` (redirect) — test mock ctx must supply a `redirect()` function.
- Integration tests for page routes need `sanitizeOps: false, sanitizeResources: false` due to pg pool connections.

## Files / Surfaces

- `routes/catalog.tsx` — rewritten: `kv.list` → `db.select().from(businesses).where(eq(isActive, true))`
- `routes/passaporte.tsx` — rewritten: `kv.list` + looped `kv.get` → single `db.select().from(redemptions).innerJoin(businesses)` with `where(and(eq(userId), eq(status,'active')))`
- `tests/mobile_catalog_integration.test.ts` — rewritten from KV to Drizzle
- `tests/passaporte_page.test.ts` — new file with 3 integration test cases

## Errors / Corrections

- FK constraint failed in catalog tests: `businesses.user_id` references `users.id`, so test must insert a user row first.
- `Response.redirect('/login')` throws "Invalid URL" with relative paths in Deno; mock must construct a Response with status 303 and location header directly.

## Ready for Next Run

- No known blockers. Both route files compile and pass tests.
