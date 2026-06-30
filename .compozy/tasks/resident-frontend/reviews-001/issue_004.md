---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/api/posts/index.ts
line: 12
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: POST and GET /api/posts return 403 for unauthenticated requests instead of 401

## Review Comment

Both handlers in `routes/api/posts/index.ts` use a combined condition for the auth
and role check:

```ts
const user = ctx.state.user
if (!user || (user.role !== 'business' && user.role !== 'admin')) {
  return new Response(
    JSON.stringify({ error: 'Forbidden: Business access required' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}
```

When `user` is `null` (unauthenticated request), `!user` is `true` so the condition
fires — but the response is `403 Forbidden` with the message "Business access
required".  The correct HTTP status for an unauthenticated request is `401
Unauthorized`.  `403` means the caller is authenticated but lacks permission; `401`
means the caller has not authenticated at all.

The same pattern affects `routes/api/posts/[id].ts` `PUT` and `DELETE` handlers.

Practical impact: client code that checks for `401` to redirect to login will never
trigger on these endpoints.  The test suite (`tests/posts_api.test.ts`) already
asserts `res.status === 401` for the unauthenticated case, so that test is currently
failing.

**Fix:** Split the check into two steps:

```ts
const user = ctx.state.user
if (!user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
}
if (user.role !== 'business' && user.role !== 'admin') {
  return new Response(
    JSON.stringify({ error: 'Forbidden: Business access required' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}
```

Apply the same fix to `routes/api/posts/[id].ts` `PUT` and `DELETE` handlers.

## Triage

- Decision: `valid`
- Notes: The combined `!user || (user.role !== 'business' && user.role !== 'admin')` condition conflates auth and authz. When `user` is `null`, the response should be 401 (Unauthenticated), not 403 (Forbidden). The fix splits into two checks: return 401 for unauthenticated requests first, then 403 for unauthorized (wrong role). Applied to all four handlers: POST/GET in `routes/api/posts/index.ts` and PUT/DELETE in `routes/api/posts/[id].ts`. Existing test at `tests/posts_api.test.ts:64` asserts 401 for unauthenticated POST and should now pass.
