---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/api/posts/[id].ts
line: 96
severity: high
author: claude-code
provider_ref:
---

# Issue 003: DELETE /api/posts/[id] does not refresh the feed_events MV

## Review Comment

The `DELETE` handler in `routes/api/posts/[id].ts` successfully deletes the post
from `merchant_posts` but never calls `refreshFeedView()`:

```ts
// routes/api/posts/[id].ts ~line 92
await db.delete(schema.merchantPosts)
  .where(eq(schema.merchantPosts.id, postId))

return new Response(null, { status: 204 })
// ← no refreshFeedView call
```

As a result, the deleted post remains visible in `feed_events` until the next
unrelated write (another post creation or coupon update) happens to trigger a
refresh.  Depending on activity level, a deleted post could continue appearing in
the resident feed for hours.

The `POST` and `PUT` handlers in the same file (and the coupon `PATCH`/`PUT`)
all call `refreshFeedView()` after writes.  This is the one write path that was
missed.

**Fix:** Add a guarded `refreshFeedView()` call after the delete:

```ts
await db.delete(schema.merchantPosts)
  .where(eq(schema.merchantPosts.id, postId))

try {
  await refreshFeedView(db)
} catch (err) {
  console.error('Failed to refresh feed view after post deletion:', err)
}

return new Response(null, { status: 204 })
```

## Triage

- Decision: `VALID`
- Notes: The DELETE handler at line 127 deletes the post but returns 204 immediately without calling refreshFeedView(). The PUT handler at line 82-86 already shows the correct pattern — a guarded try/catch around refreshFeedView(db) after the write. Root cause: the DELETE write path was simply missed. Fix: add the same guarded refreshFeedView() call after the delete and before the 204 response, matching the PUT handler's pattern.

## Verification

- **Code fix:** Added guarded `refreshFeedView()` call after `db.delete()` in the DELETE handler at `routes/api/posts/[id].ts:130-134`.
- **Tests added:**
  1. `DELETE /api/posts/[id] - post is removed from feed_events after deletion` — Verifies the feed_event row is present before and absent after DELETE.
  2. `DELETE /api/posts/[id] - MV refresh failure does not block deletion` — Verifies DELETE succeeds even if MV refresh throws (matches existing pattern).
- **Type-check:** Both `routes/api/posts/[id].ts` and `tests/posts_api.test.ts` pass `deno check`.
- **`deno task check`:** Formatting passes. Lint reports 28 pre-existing issues in other files (unrelated to this change). Type-check passes for all changed files.
- **Verdict:** Fix verified. Pre-existing lint failures are in unrelated files — not caused by this change.
