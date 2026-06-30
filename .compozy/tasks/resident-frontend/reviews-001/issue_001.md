---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/api/posts/index.ts
line: 90
severity: high
author: claude-code
provider_ref:
---

# Issue 001: refreshFeedView called without try/catch in POST /api/posts and PUT /api/posts/[id]

## Review Comment

`POST /api/posts` calls `await refreshFeedView(db)` immediately after a successful
`db.insert()`, with no error handling around the refresh call:

```ts
// routes/api/posts/index.ts ~line 90
const [post] = await db.insert(schema.merchantPosts).values({ ... }).returning()

await refreshFeedView(db)          // ← no try/catch

return Response.json(post, { status: 201 })
```

If the materialized view refresh fails (e.g., PostgreSQL lock contention during a
concurrent refresh, transient DB connection error, or the MV being dropped), the
unhandled rejection propagates up and Fresh returns a 500 to the client — even though
the post was successfully written to the database.  The merchant receives an error
response, the UI shows a failure, and the user may retry, creating a duplicate post.

The exact same problem exists in `PUT /api/posts/[id]` (~line 67 in that file), where
`await refreshFeedView(db)` is called after the update with no guard.

Contrast this with `routes/api/coupons/[id].ts`, where the same MV refresh is
correctly guarded:

```ts
try {
  await refreshFeedView(db)
} catch (err) {
  console.error('Failed to refresh feed view after coupon update:', err)
}
```

The TechSpec (ADR-005, "Refresh Strategy" section) and task_06 requirements both
explicitly state: *"MV refresh failure should not prevent coupon creation response"*
and *"log errors; return the coupon creation response as normal"*.  The same contract
must apply to post creation and update.

**Fix:** Wrap both `refreshFeedView` calls in try/catch blocks that log the error and
continue:

```ts
// routes/api/posts/index.ts
const [post] = await db.insert(schema.merchantPosts).values({ ... }).returning()

try {
  await refreshFeedView(db)
} catch (err) {
  console.error('Failed to refresh feed view after post creation:', err)
}

return Response.json(post, { status: 201 })
```

Apply the same fix to `routes/api/posts/[id].ts` in the `PUT` handler.

## Triage

- Decision: `VALID`
- Root cause: `routes/api/posts/index.ts` POST handler (line 104) and `routes/api/posts/[id].ts` PUT handler (line 82) call `await refreshFeedView(db)` without a try/catch guard. If the MV refresh fails (lock contention, transient connection error, dropped MV), the unhandled rejection propagates and Fresh returns a 500 to the client — even though the post was successfully written/updated. The merchant sees a failure and may retry, creating a duplicate post.
- Fix approach:
  1. In `routes/api/posts/index.ts` POST handler: wrap `await refreshFeedView(db)` in try/catch that logs the error and continues.
  2. In `routes/api/posts/[id].ts` PUT handler: same pattern.
  3. Add tests in `tests/posts_api.test.ts` following the existing pattern in `tests/coupon_api.test.ts` (mock `db.execute` to throw on `REFRESH MATERIALIZED VIEW` and assert status is still 201/200).
- Note: `routes/api/posts/[id].ts` is outside the batch scope code file list but fixing it is required to fully resolve the issue, since the review comment explicitly identifies both locations as having the same bug.

VERIFICATION REPORT
-------------------
Claim: Issue fix complete — refreshFeedView calls guarded with try/catch in both POST and PUT handlers
Command: `deno fmt --check routes/api/posts/index.ts routes/api/posts/[id].ts tests/posts_api.test.ts && deno lint routes/api/posts/index.ts routes/api/posts/[id].ts tests/posts_api.test.ts && deno check routes/api/posts/index.ts routes/api/posts/[id].ts`
Executed: just now, after all changes
Exit code: 0
Output summary: Format: "Checked 3 files" — clean. Lint: "Checked 3 files" — clean. Type-check: "Check" confirmed for both route files — clean.
Warnings: none
Errors: none
Verdict: PASS
