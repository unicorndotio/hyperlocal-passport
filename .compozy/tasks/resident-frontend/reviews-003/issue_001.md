---
provider: manual
pr:
round: 3
round_created_at: 2026-06-30T17:44:54Z
status: resolved
file: routes/passaporte.tsx
line: 15
severity: high
author: claude-code
provider_ref:
---

# Issue 001: passaporte.tsx calls auth.api.getSession() directly instead of ctx.state.user

## Review Comment

`routes/passaporte.tsx` calls `auth.api.getSession()` a second time on every request,
even though `_middleware.ts` already runs it and injects the result into
`ctx.state.user`:

```ts
// routes/passaporte.tsx ~line 15
const session = await auth.api.getSession({ headers: ctx.req.headers })

if (!session) {
  return ctx.redirect('/login')
}

const userId = session.user.id
```

This was identified in round 2 (issue_002) as the same pattern affecting three
routes. The round 2 fix was scoped to `routes/api/users/me/savings.ts` only; the
triage note explicitly deferred `routes/passaporte.tsx` and `routes/business/posts.tsx`
as "not in this batch's scope." The passaporte route remains unfixed.

**Consequences:**

1. **Redundant database round-trip**: every `/passaporte` page load performs two
   session lookups (one in middleware, one in the handler), adding unnecessary
   latency on a page that the PRD describes as the core "wow" moment for residents
   at the point of sale.

2. **Test anti-pattern**: `tests/passaporte_page.test.ts` works around this by
   stubbing `auth.api.getSession` with `stub(auth.api, 'getSession', ...)`. If the
   route is ever refactored to use `ctx.state.user`, those stubs become dead code.
   The test should be providing a `state.user` on the context instead, matching the
   correct pattern used in savings and posts tests.

3. **Inconsistency**: all new routes introduced in this feature
   (`/api/posts`, `/api/feed`, `/api/users/me/savings`) correctly read
   `ctx.state.user`. The passaporte route is the only page route that deviates,
   creating a maintenance trap for future contributors.

**Fix:** Replace the `auth.api.getSession` call with `ctx.state.user`:

```ts
// routes/passaporte.tsx — corrected handler
export const handler = define.handlers({
  async GET(ctx) {
    const user = ctx.state.user
    if (!user) {
      return ctx.redirect('/login')
    }

    const userId = user.id

    // ... rest of handler unchanged ...
  },
})
```

Also remove the `import { auth } from '../lib/auth.ts'` line, which becomes unused.

Update `tests/passaporte_page.test.ts` to pass `state.user` on the context
instead of using `stub(auth.api, 'getSession', ...)`:

```ts
// Before (anti-pattern):
const getSessionStub = stub(auth.api, 'getSession', () => Promise.resolve({ user: ... }))

// After (correct pattern):
const res = await (passaporteHandler as unknown as PassaporteHandler).GET({
  req: new Request('http://localhost:8000/passaporte'),
  state: { user: { id: userId, role: 'resident', ... }, session: { ... } },
  redirect: mockRedirect,
})
```

## Triage

- Decision: `VALID`
- Notes: Route uses `auth.api.getSession()` on line 15 even though `_middleware.ts` already runs this and injects `user`/`session` into `ctx.state`. The round 2 fix for `savings.ts` deferred this route. Fix: replace with `ctx.state.user`, remove `auth` import, update tests to pass `state.user` on context instead of stubbing `auth.api.getSession`.

**Root cause:** Developer missed this route during round 2 fix; the round 2 issue file explicitly deferred it as out of scope.

**Fix approach:**
1. `routes/passaporte.tsx`: Replace `auth.api.getSession()` → `ctx.state.user`, remove `auth` import.
2. `tests/passaporte_page.test.ts`: Remove `stub` import and `auth` import. Pass `state: { user, session }` on context objects instead of using `getSessionStub`. Remove `try/finally` stub restoration; keep DB cleanup.
