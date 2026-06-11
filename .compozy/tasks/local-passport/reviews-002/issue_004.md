---
provider: manual
pr:
round: 2
round_created_at: 2026-06-11T00:43:51Z
status: resolved
file: routes/api/businesses/[id]/profile.ts
line: 88
severity: low
author: claude-code
provider_ref:
---

# Issue 004: Upload error response uses raw string body instead of structured JSON

## Review Comment

When the logo upload fails in the multipart path of `handleProfileUpdate`, line 88–91 returns the error as a raw string body instead of a structured JSON response:

```ts
return json(
  err instanceof Error ? err.message : 'Upload failed',
  400,
)
```

Because `json()` calls `JSON.stringify(body)`, this produces a JSON string literal (e.g., `"File is empty"`) as the response body, rather than the standard `{"error": "File is empty"}` object used by every other error response in the codebase. The same pattern appears in `routes/api/businesses/index.ts` lines 57–60.

This inconsistency:
- Breaks API contract expectations for consumers that parse `body.error`.
- The frontend (`BusinessProfileEditor.tsx` line 172) reads `res.text()` and wraps it in an `Error`, so the JSON string quotes leak into the displayed error message.

**Fix:** Wrap the error message in a consistent object structure:

```ts
return json(
  { error: err instanceof Error ? err.message : 'Upload failed' },
  400,
)
```

## Triage

- Decision: `VALID`
- Root cause: `routes/api/businesses/[id]/profile.ts:87-90` passes a raw string as the body to `json()`, producing a JSON string literal (e.g. `"File is empty"`) instead of the standard `{"error": "File is empty"}` object used by every other error response.
- Fix: Wrapped the error message in `{ error: ... }` at line 88. Added a test case in `tests/routes/api/businesses/profile_test.ts` that asserts the upload error response has `body.error === 'File is empty'`.
- Note: The same pattern also appears in `routes/api/businesses/index.ts` at lines 57–60, but that file is outside this batch scope.
