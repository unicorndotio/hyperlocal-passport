---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: routes/api/users/me/savings.ts
line: 7
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Savings and passaporte routes call auth.api.getSession() directly instead of using ctx.state.user

## Review Comment

The `_middleware.ts` already runs `auth.api.getSession()` on every request and
injects the result into `ctx.state.user` and `ctx.state.session`. All new routes
introduced in this feature (`/api/posts`, `/api/feed`, `/api/coupons/[id]`) correctly
use `ctx.state.user` without a second session lookup:

```ts
// routes/api/posts/index.ts — correct pattern
const user = ctx.state.user
if (!user) { return new Response(..., { status: 401 }) }
```

However, two routes call `auth.api.getSession()` a **second time** on every request:

```ts
// routes/api/users/me/savings.ts ~line 7
const session = await auth.api.getSession({ headers: ctx.req.headers })
if (!session) { return new Response('Unauthorized', { status: 401 }) }
```

```ts
// routes/passaporte.tsx ~line 15
const session = await auth.api.getSession({ headers: ctx.req.headers })
if (!session) { return ctx.redirect('/login') }
```

The same pattern appears in `routes/business/posts.tsx` (line 18).

This causes:
1. **Redundant database round-trip**: each request to these endpoints performs two
   session lookups instead of one.
2. **Inconsistency**: the session from `ctx.state` (set by middleware) and the
   freshly-fetched session may theoretically diverge in edge cases (e.g., session
   invalidated between middleware and handler execution), but in practice both will
   be consistent. The real problem is the extra latency cost and the maintenance
   confusion — a future developer may not realize `ctx.state.user` is already set
   and continue duplicating the pattern.
3. **Missing role-awareness**: `routes/passaporte.tsx` re-fetches the session to get
   `userId`, but `ctx.state.user` already exposes `ctx.state.user.id` without
   the extra call.

**Fix:** Replace `auth.api.getSession({ headers: ctx.req.headers })` with
`ctx.state.user` in all three affected handlers:

```ts
// routes/api/users/me/savings.ts
async GET(ctx) {
  const user = ctx.state.user
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (user.role !== 'resident') {
    return new Response('Forbidden', { status: 403 })
  }
  const summary = await getSavingsSummary(user.id)
  return Response.json(summary)
}
```

```ts
// routes/passaporte.tsx
async GET(ctx) {
  const user = ctx.state.user
  if (!user) {
    return ctx.redirect('/login')
  }
  const userId = user.id
  // ... rest of handler unchanged
}
```

Also apply the same fix to `routes/business/posts.tsx` (line 18).

## Triage

- Decision: `VALID`
- Notes:
  The middleware at `routes/_middleware.ts:119-122` calls `auth.api.getSession()` once and
  injects the result into `ctx.state.user` and `ctx.state.session`. All request handlers
  reachable past the middleware are guaranteed to have `ctx.state.user` set (the middleware
  returns 401 for unauthenticated requests to API routes like `/api/users/me/savings`).
  Calling `auth.api.getSession()` a second time in the handler is purely redundant and adds
  an unnecessary database round-trip.

  Fix confirmed in scope: rewrite `routes/api/users/me/savings.ts` to use `ctx.state.user`
  instead of `auth.api.getSession()`, and update `tests/savings_api.test.ts` to pass
  `state` in the handler context instead of stubbing `auth.api.getSession()`.

  Note: The issue also mentions `routes/passaporte.tsx` and `routes/business/posts.tsx`,
  but those files are not in this batch's scope (`routes/api/users/me/savings.ts` only).

