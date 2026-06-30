---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/api/coupons/[id].ts
line: 89
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: DELETE /api/coupons/[id] does not refresh the feed_events MV

## Review Comment

The `DELETE` handler deletes the coupon from `coupons` but never triggers a feed
view refresh:

```ts
// routes/api/coupons/[id].ts ~line 86
await db.delete(schema.coupons)
  .where(eq(schema.coupons.id, id))
return new Response(null, { status: 204 })
// ← no refreshFeedView call
```

`coupons` is one of the two source tables for `feed_events` (`coupon_released`
events come from rows where `is_active = true`).  After a coupon is deleted, its
`coupon_released` entry stays in the MV until the next unrelated refresh.

The `PUT`/`PATCH` handlers in the same file correctly guard and call
`refreshFeedView()`.  The `DELETE` path was overlooked — the same oversight as in
`routes/api/posts/[id].ts` DELETE (tracked in issue_003).

**Fix:** Add a guarded refresh after the delete:

```ts
await db.delete(schema.coupons)
  .where(eq(schema.coupons.id, id))

try {
  await refreshFeedView(db)
} catch (err) {
  console.error('Failed to refresh feed view after coupon deletion:', err)
}

return new Response(null, { status: 204 })
```

## Triage

- Decision: **Valid** — the DELETE handler at line 102 deletes the coupon but returns 204 without
  calling `refreshFeedView()`. The PUT/PATCH handlers in the same file (lines 57-61) already show
  the correct guarded pattern. Root cause: the delete codepath was simply missed. Fix: add the
  same guarded `refreshFeedView(db)` call after `db.delete()` and before the 204 response.
