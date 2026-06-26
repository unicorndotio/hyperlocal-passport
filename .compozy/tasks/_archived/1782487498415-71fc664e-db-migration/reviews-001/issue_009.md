---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: main.ts
line: 60
severity: low
author: claude-code
provider_ref:
---

# Issue 009: Unused exported initializeApp function is dead code

## Review Comment

In [main.ts](file:///Users/dev/nodo/passport/deno/main.ts#L60-L63), the function `initializeApp` is exported but is never imported or called anywhere in the codebase. Since Fresh 2 uses Vite to build and startup the application using standard entrypoints, this initialization function remains dead code and does not execute on startup.

### Suggested Fix

If async database initialization is not required (since Docker Compose health checks ensure PostgreSQL is already online, and Drizzle/node-pg handles lazy connection pooling automatically), this function and its helpers (like `waitForPostgreSQL`) should be removed to simplify the entrypoint. Alternatively, call `initializeApp()` at the top-level of `main.ts` or during server boot if startup connection validation is explicitly desired.

## Triage

- Decision: `VALID`
- Root cause: `initializeApp` and its helper `waitForPostgreSQL` are defined and exported but never imported or called anywhere in the codebase (confirmed via grep). The imports `testConnection` and `maskConnectionString` from `./lib/db.ts` are only used by these dead functions (though `testConnection`/`maskConnectionString` are also used in `tests/db.test.ts` via direct import from `./lib/db.ts`).
- Fix: Remove `initializeApp`, `waitForPostgreSQL`, and the unused `maskConnectionString`/`testConnection` imports from `main.ts`. Docker Compose health checks and Drizzle's lazy connection pooling make explicit startup connection validation unnecessary.
```
