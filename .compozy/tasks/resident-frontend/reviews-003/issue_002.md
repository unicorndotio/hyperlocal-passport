---
provider: manual
pr:
round: 3
round_created_at: 2026-06-30T17:44:54Z
status: resolved
file: routes/business/posts.tsx
line: 18
severity: high
author: claude-code
provider_ref:
---

# Issue 002: business/posts.tsx calls auth.api.getSession() directly instead of ctx.state.user

## Review Comment

`routes/business/posts.tsx` calls `auth.api.getSession()` directly, bypassing the
session already available in `ctx.state.user`:

```ts
// routes/business/posts.tsx ~line 18
export default define.page(async function BusinessPostsPage(ctx) {
  const session = await auth.api.getSession({ headers: ctx.req.headers })

  if (!session || session.user.role !== 'business') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    })
  }
  // ...
  const [business] = await db.select().from(schema.businesses).where(
    eq(schema.businesses.userId, session.user.id),
  ).limit(1) as unknown as Business[]
})
```

This is the same root-cause pattern identified in round 2 (issue_002), which was
explicitly deferred for this file. It carries the same consequences:

1. **Redundant DB round-trip** on every page load for the merchant post publishing
   interface.

2. **Unsafe `as unknown as Business[]` cast**: the cast hides a type mismatch
   between the Drizzle select return type and `Business[]`. This is a symptom of
   the workaround needed when the session isn't available via typed context state.
   The middleware-injected `ctx.state.user` carries the correct type without casting.

3. **Inconsistency** with all other API routes in the feature, which correctly use
   `ctx.state.user`. A future contributor adding a new business-facing route may
   follow this file as a template and continue the anti-pattern.

Additionally, the page function uses `define.page(async function ...)` as a
combined handler/renderer. The middleware runs before the page function, so
`ctx.state.user` is available. The manual session call is purely redundant.

**Fix:** Remove the `auth.api.getSession` call and use `ctx.state.user`:

```ts
export default define.page(async function BusinessPostsPage(ctx) {
  const user = ctx.state.user

  if (!user || user.role !== 'business') {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' },
    })
  }

  const [business] = await db.select().from(schema.businesses).where(
    eq(schema.businesses.userId, user.id),
  ).limit(1)

  // ... rest of page unchanged
})
```

Also remove the now-unused `import { auth } from '@/lib/auth.ts'` line, and remove
the `as unknown as Business[]` cast since the Drizzle return type is correct
without the workaround.

## Triage

- Decision: `valid`
- Notes: The issue correctly identifies the redundant `auth.api.getSession()` call. The middleware at `routes/_middleware.ts` already injects `ctx.state.user` for all `/business/*` routes (lines 92-101), making the manual session call unnecessary. The fix replaces the session call with `ctx.state.user`, removes the unused `auth` import, and uses a cleaner cast pattern.

## Fix Applied

1. Removed `import { auth } from '@/lib/auth.ts'` (no longer needed)
2. Replaced `auth.api.getSession()` with `ctx.state.user`
3. Changed `session.user.role` → `user.role` and `session.user.id` → `user.id`
4. Changed `as unknown as Business[]` → `as unknown as [Business | undefined]` (cleaner single-element tuple cast, consistent with 5 other business route files that have the same Drizzle-vs-interface type mismatch)
5. Added `tests/business_posts_page.test.ts` with 4 test cases:
   - Redirect to `/login` when user is `null`
   - Redirect to `/login` when role is `resident`
   - Renders page for valid business user (DB)
   - Shows restricted access card when no business linked (DB)
