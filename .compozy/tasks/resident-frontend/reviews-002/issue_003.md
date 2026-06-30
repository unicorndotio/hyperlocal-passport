---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: routes/api/posts/index.ts
line: 24
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Admin role returns 404 from GET/POST /api/posts — business lookup uses userId which admins lack

## Review Comment

Both `POST` and `GET` handlers in `routes/api/posts/index.ts` pass the role check
for `admin` users, but then immediately do a business lookup that will always fail
for admins:

```ts
// routes/api/posts/index.ts ~line 17–29 (POST handler)
if (user.role !== 'business' && user.role !== 'admin') {
  return new Response(..., { status: 403 })  // Admins pass this check
}

const [business] = await db.select().from(schema.businesses)
  .where(eq(schema.businesses.userId, user.id))  // Admins have no business record
  .limit(1)

if (!business) {
  return new Response(
    JSON.stringify({ error: 'Business not found' }),
    { status: 404, ... }  // ← Admins always hit this
  )
}
```

Identical logic exists in the `GET` handler (~line 127–142). The same pattern
appears in `routes/api/posts/[id].ts` `PUT` and `DELETE` handlers.

The TechSpec API table explicitly lists admin as an authorized role for all post
endpoints:
> POST `/api/posts` | **Business** — and the role check allows admin

There are two sensible interpretations:

1. **Admin should be able to moderate posts across all businesses** — in this case
   the admin path needs different logic (no business scoping).
2. **Admin access was included as a future-proofing guard, but admins are not
   expected to call this endpoint in V1** — in this case the role check should
   be tightened to `business`-only to avoid a confusing 404.

The current code allows admins past the auth gate but then returns a 404 — an
inconsistent and confusing response that suggests implementation was never tested
with an admin session.

**Fix (option A — restrict to business-only, cleaner for V1):**

```ts
if (user.role !== 'business') {
  return new Response(
    JSON.stringify({ error: 'Forbidden: Business access required' }),
    { status: 403, ... }
  )
}
```

**Fix (option B — full admin support):**

```ts
let businessId: string
if (user.role === 'admin') {
  // Admin can optionally scope by ?businessId query param, or see all
  const qBusinessId = new URL(ctx.req.url).searchParams.get('businessId')
  if (!qBusinessId) {
    // Return all posts across all businesses
    const posts = await db.select().from(schema.merchantPosts)
      .orderBy(desc(schema.merchantPosts.createdAt))
    return Response.json(posts)
  }
  businessId = qBusinessId
} else {
  const [business] = await db.select().from(schema.businesses)
    .where(eq(schema.businesses.userId, user.id)).limit(1)
  if (!business) {
    return new Response(JSON.stringify({ error: 'Business not found' }), { status: 404 })
  }
  businessId = business.id
}
```

Option A is recommended for V1 given the PRD's "Self-service business onboarding is
out of scope" note and the absence of any admin post-management UI. Applies to all
four handlers in `routes/api/posts/index.ts` and `routes/api/posts/[id].ts`.

## Triage

- Decision: `VALID`
- Notes: The role check allows admins through (`user.role !== 'business' && user.role !== 'admin'`), but the subsequent business lookup via `eq(schema.businesses.userId, user.id)` always returns empty for admins (they have no business record), resulting in a confusing 404. Applying Option A (business-only restriction) across all 4 handlers in `routes/api/posts/index.ts` and `routes/api/posts/[id].ts`. This is the correct V1 approach since no admin post-management UI exists and the PRD notes self-service business onboarding is out of scope.

