---
provider: manual
pr:
round: 3
round_created_at: 2026-06-26T15:16:00Z
status: resolved
file: lib/db.ts
line: 12
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Resource leak in Deno tests due to unclosed database connection pool

## Review Comment

In [lib/db.ts](file:///Users/dev/nodo/passport/deno/lib/db.ts#L12-L16), the `Pool` client is initialized globally and there is no exported method to shut down the pool connections during test suite teardown. Since `addEventListener('unload', ...)` is only invoked when the entire Deno process terminates, Deno's test runner raises resource leaks (`A TCP connection was opened/accepted during the test, but not closed`) on almost all test files that interact with the database.

### Suggested Fix

Export a cleanup function from `lib/db.ts` to allow tests to explicitly close the pool:

```ts
export async function closeConnection(): Promise<void> {
  await pool.end()
}
```

Then invoke `closeConnection` in test files' cleanup / after-all hooks, or disable resources/ops sanitization for database tests by adding `sanitizeResources: false, sanitizeOps: false` to the `Deno.test` options.

## Triage

- Decision: `valid`
- Root cause: `lib/db.ts` initializes a global `Pool` but only closes it via `addEventListener('unload', ...)`, which fires after the Deno process fully exits. Deno's test runner detects TCP connections opened during test lifetime as leaked resources, producing warnings on every test file that imports `db` from `lib/db.ts`.
- Existing tests use two workarounds: (1) disabling `sanitizeResources`/`sanitizeOps` on individual tests, or (2) creating a separate pool in `auth.test.ts` with manual cleanup. Neither uses a shared cleanup from `lib/db.ts`.
- Fix: Export `closeConnection()` from `lib/db.ts` so test files and server code can explicitly close the pool. Also add a test for `closeConnection` in `db.test.ts`.
- No additional code files needed beyond `lib/db.ts` and `tests/db.test.ts`.
