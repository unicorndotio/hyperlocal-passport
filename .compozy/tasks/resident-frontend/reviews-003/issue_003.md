---
provider: manual
pr:
round: 3
round_created_at: 2026-06-30T17:44:54Z
status: resolved
file: routes/api/feed.ts
line: 10
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: NaN limit parameter causes LIMIT NaN SQL error in queryFeed

## Review Comment

Both `routes/api/feed.ts` and `routes/index.tsx` parse the `?limit=` query
parameter with `parseInt` and pass the result directly to `queryFeed`:

```ts
// routes/api/feed.ts ~line 9
const limitParam = url.searchParams.get('limit')
const limit = limitParam ? parseInt(limitParam, 10) : undefined
// ...
const result = await queryFeed(db, userId, cursor, limit)
```

```ts
// routes/index.tsx ~line 15
const limitParam = url.searchParams.get('limit')
const limit = limitParam ? parseInt(limitParam, 10) : undefined
```

When `limitParam` is a non-numeric string (e.g., `?limit=abc`, `?limit=1e5`,
`?limit=NaN`), `parseInt('abc', 10)` returns `NaN`. Because `NaN` is truthy when
checked as a value but is not `null` or `undefined`, the nullish coalescing
fallback inside `queryFeed` does not activate:

```ts
// lib/feed.ts ~line 50
const pageSize = Math.min(Math.max(limit ?? 20, 1), 100)
// → Math.min(Math.max(NaN ?? 20, 1), 100)
// → Math.min(Math.max(NaN, 1), 100)
// → Math.min(NaN, 100)
// → NaN
```

`pageSize` becomes `NaN`, which is then interpolated into the SQL template literal:

```ts
mvSql = sql`${mvSql} ORDER BY created_at DESC LIMIT ${pageSize}`
// → "ORDER BY created_at DESC LIMIT NaN"
```

PostgreSQL will reject `LIMIT NaN` with a syntax error, causing an unhandled
exception that Fresh surfaces as a 500 to the caller. Any URL that includes
a non-integer `limit` parameter (accidental or malicious) reliably crashes the
feed endpoint.

The same issue applies to the transaction query inside `queryFeed`:

```ts
txSql = sql`${txSql} ORDER BY t."timestamp" DESC LIMIT ${pageSize}`
```

**Fix:** Validate the parsed integer in both route handlers before passing it to
`queryFeed`, falling back to `undefined` for invalid values:

```ts
// routes/api/feed.ts (and same pattern in routes/index.tsx)
const limitParam = url.searchParams.get('limit')
const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN
const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
  ? parsedLimit
  : undefined
const result = await queryFeed(db, userId, cursor, limit)
```

Alternatively, add a `Number.isFinite` guard inside `queryFeed` itself as a
defence-in-depth measure, so callers can never accidentally produce `LIMIT NaN`:

```ts
// lib/feed.ts
const rawPageSize = limit ?? 20
const pageSize = Math.min(Math.max(Number.isFinite(rawPageSize) ? rawPageSize : 20, 1), 100)
```

The defensive fix in `queryFeed` is recommended as it protects all callers
(including `routes/index.tsx`).

Add a test case for the malformed limit:

```ts
await t.step('GET /api/feed?limit=abc returns 200 with default page size', async () => {
  const req = new Request('http://localhost/api/feed?limit=abc')
  const res = await handler.GET({ req, state: { user: null, session: null } })
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(Array.isArray(body.events), true)
})
```

## Triage

- Decision: `VALID`
- Root cause: `parseInt('abc', 10)` → `NaN`; `NaN` is not nullish so `limit ?? 20` evaluates to `NaN`; `Math.min(Math.max(NaN, 1), 100)` → `NaN`; SQL `LIMIT NaN` causes PG syntax error → 500.
- Fix: (1) Defence-in-depth in `queryFeed` (`lib/feed.ts`) — guard with `Number.isFinite`. (2) Validate parsed int in `routes/api/feed.ts` and `routes/index.tsx` — fall back to `undefined` when `Number.isFinite` fails. (3) Add test case for `GET /api/feed?limit=abc`.
