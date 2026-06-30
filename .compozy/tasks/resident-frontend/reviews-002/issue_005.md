---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: routes/api/posts/index.ts
line: 79
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: JSON POST path accepts arbitrary imageUrl without URL validation

## Review Comment

When `POST /api/posts` receives a JSON body (non-multipart), the `imageUrl` field
is accepted and stored verbatim with no validation:

```ts
// routes/api/posts/index.ts ~line 79
imageUrl = (json.imageUrl as string) || undefined
// ... no URL check before inserting into DB
const [post] = await db.insert(schema.merchantPosts).values({
  imageUrl: imageUrl || null,
  // ...
})
```

A business user with a valid session can store any string in `image_url`, including:
- External URLs (e.g., tracking pixels, URLs to competitor content)
- Internal service URLs that the app's HTTP client may inadvertently fetch
  (SSRF vector if the feed renderer ever does server-side image fetching)
- Malformed strings that will render as broken images in `FeedEventCard`

The multipart path correctly runs the file through `uploadFile()` which generates
an internal URL under `/api/uploads/...`. The JSON path bypasses this entirely.

**Impact for V1:** The MerchantPostForm island only ever sends multipart FormData,
so end-to-end usage from the UI is safe. However, any authenticated business user
can call `POST /api/posts` directly with `Content-Type: application/json` and inject
any URL.

**Fix:** Either reject `imageUrl` in the JSON path (force callers to use multipart
for images) or add URL validation to ensure the URL is an internal uploads URL:

```ts
// Option A: Reject imageUrl entirely in JSON path
// (callers must upload via multipart if they want an image)
if (json.imageUrl) {
  return new Response(
    JSON.stringify({ error: 'Image must be uploaded via multipart/form-data' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}
```

```ts
// Option B: Validate that it's an internal uploads URL
if (json.imageUrl) {
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'
  const allowedPrefix = `${baseUrl}/api/uploads/`
  if (typeof json.imageUrl !== 'string' || !json.imageUrl.startsWith(allowedPrefix)) {
    return new Response(
      JSON.stringify({ error: 'imageUrl must be an internal uploads URL' }),
      { status: 400, ... }
    )
  }
}
```

Option A is simpler and keeps the API surface consistent — images always go through
the upload pipeline. Option B is appropriate if the JSON path is used by trusted
internal tooling.

## Triage

- Decision: `VALID`
- Notes: JSON POST path stores imageUrl verbatim from request body — no URL validation. An authenticated business user can inject any external URL, creating SSRF risk and broken images in the feed. Multipart path already handles images properly through uploadFile(). Fix: Option A — reject imageUrl in JSON path entirely. Existing test at tests/posts_api.test.ts:145-169 tests sending external imageUrl via JSON and expects 201 — must be updated to expect 400.

- Root cause: routes/api/posts/index.ts:79 — `imageUrl = (json.imageUrl as string) || undefined` with no validation before DB insert.

- Fix approach:
  1. Add early rejection of `json.imageUrl` in the JSON branch (before title/body extraction)
  2. Update the test that sends `imageUrl: 'https://example.com/image.jpg'` via JSON to expect 400
  3. Leave multipart path unchanged

