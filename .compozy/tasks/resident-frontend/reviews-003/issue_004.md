---
provider: manual
pr:
round: 3
round_created_at: 2026-06-30T17:44:54Z
status: resolved
file: routes/api/posts/[id].ts
line: 62
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: PUT /api/posts/[id] accepts arbitrary imageUrl without validation

## Review Comment

The `PUT` handler in `routes/api/posts/[id].ts` reads `imageUrl` from the JSON body
and stores it to the database verbatim, with no URL validation:

```ts
// routes/api/posts/[id].ts ~line 62
const imageUrl = json.imageUrl as string | undefined
// ...
if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null
```

An authenticated business user can call `PUT /api/posts/:id` with any string in
`imageUrl`, including external URLs, data URIs, JavaScript pseudo-URLs, or internal
service URLs:

```json
{ "imageUrl": "https://attacker.example.com/tracking.gif" }
{ "imageUrl": "javascript:alert(1)" }
{ "imageUrl": "http://internal-service:2375/containers/json" }
```

Round 2 (issue_005) fixed the exact same pattern in the `POST /api/posts` JSON path
by adding early rejection:

```ts
// routes/api/posts/index.ts ~line 79 — correctly fixed
if (json.imageUrl) {
  return new Response(
    JSON.stringify({ error: 'Image must be uploaded via multipart/form-data' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}
```

The `PUT` handler was not updated alongside the `POST` handler. This means a
merchant can create a post safely (multipart only), then immediately `PUT` the post
to swap the image URL to any arbitrary value — bypassing the upload pipeline.

**Practical impact:** The `MerchantPostForm` island does not currently expose an
image field on the edit/update path (it only supports create + delete). But any
business user with a valid session can call the API directly. Once an external URL
is stored, it appears in `feed_events` after the next MV refresh and is served to
all residents via `FeedEventCard`, which renders it with an `<img>` tag:

```tsx
<img src={event.imageUrl} loading='lazy' class='...' />
```

**Fix:** Reject `imageUrl` in the `PUT` JSON body, consistent with the `POST`
handler:

```ts
// routes/api/posts/[id].ts — PUT handler
const title = json.title as string | undefined
const body = json.body as string | undefined

if (json.imageUrl !== undefined) {
  return new Response(
    JSON.stringify({ error: 'Image must be updated via multipart/form-data' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}
```

If the product requires merchants to be able to clear an image (set to `null`),
handle that as an explicit `removeImage` boolean flag rather than accepting an
arbitrary URL string:

```ts
if (json.removeImage === true) {
  updateData.imageUrl = null
}
```

Add a test to `tests/posts_api.test.ts` asserting that `PUT` with `imageUrl` in
the body returns 400.

## Triage

- Decision: `VALID`
- Root cause: Line 62-80 in `routes/api/posts/[id].ts` — `PUT` handler reads `imageUrl` from JSON body and stores it verbatim with no validation. The identical vulnerability in `POST` was fixed in Round 2 (`routes/api/posts/index.ts:77-84`) but the `PUT` handler was missed.
- Fix applied:
  1. Added early rejection of `imageUrl` in PUT JSON body (lines 63-70), returning 400 with `'Image must be updated via multipart/form-data'`
  2. Removed `const imageUrl = json.imageUrl as string | undefined` and the subsequent `updateData.imageUrl` assignment
  3. Added `removeImage` boolean flag handling: `if (json.removeImage === true) updateData.imageUrl = null` (line 88) — allows merchants to clear an image
  4. Added test step `'rejects imageUrl in PUT JSON body'` in `tests/posts_api.test.ts` asserting 400 status and matching error message
- Verification: `deno task check` passes (0 new errors; 28 pre-existing lint issues in untouched files). DB-dependent tests skip when PG_CONNECTION is not set; the guard is the same pattern used by the POST handler tests.
- Severity: medium — no frontend UI exposes image editing on PUT path, but any authenticated business can call the API directly.
