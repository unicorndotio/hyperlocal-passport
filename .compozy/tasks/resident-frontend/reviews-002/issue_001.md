---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: lib/storage.ts
line: 120
severity: high
author: claude-code
provider_ref:
---

# Issue 001: File type validation uses AND instead of OR — allows mismatched MIME + extension

## Review Comment

The file-type guard in `uploadFile()` uses a logical AND (`&&`), which means a file
is rejected only when **both** the extension is disallowed **and** the MIME type is
disallowed:

```ts
// lib/storage.ts ~line 120
if (
  !allowedExtensions.includes(ext) &&
  (mimeType && !allowedMimeTypes.includes(mimeType))
) {
  throw new Error('Invalid file type')
}
```

This has two bypass paths:

1. **Allowed extension, wrong MIME type**: A file named `malicious.jpg` with
   `Content-Type: application/javascript` passes validation because
   `allowedExtensions.includes('jpg')` is true, making the whole condition false.

2. **Wrong extension, no MIME type**: A file without a detectable MIME type (e.g.,
   a `Blob` rather than a `File`) defaults `ext` to `'bin'`. Because `ext` is not
   in `allowedExtensions`, the left side is `true`, but if `mimeType` is empty or
   falsy, `(mimeType && !allowedMimeTypes.includes(mimeType))` evaluates to `false`
   — the whole condition is `false` and the `.bin` file passes.

The correct logic is to reject a file when **either** the extension or the MIME type
is disallowed (i.e., use `||`):

```ts
if (
  !allowedExtensions.includes(ext) ||
  (mimeType && !allowedMimeTypes.includes(mimeType))
) {
  throw new Error('Invalid file type')
}
```

Additionally, the size guard (`isImage && file.size > MAX_IMAGE_SIZE_BYTES`) only
applies to JPEG/PNG. GIF and WebP uploads have no size cap, and PDF uploads have no
size cap either. Consider extending the size check to all upload types or at minimum
to all image types:

```ts
const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) { ... }
```

This is especially relevant for merchant-post images (GIF, WebP) which are uploaded
without compression if sharp is not available.

**Fix:**
1. Change `&&` to `||` in the validation condition at line 120.
2. Extend the image size cap to include `gif` and `webp`.

## Triage

- Decision: `VALID`
- Notes: Both bugs confirmed in `lib/storage.ts`. Fix 1: Changed `&&` to `||` at line 120 so validation rejects files when either extension OR MIME type is disallowed. Fix 2: Extended `isImage` check at line 127 to include `gif` and `webp`. Added 4 new test cases: (a) allowed extension `.jpg` with `application/javascript` MIME rejected, (b) Blob without extension/MIME (falls to `.bin`) rejected, (c) oversized GIF rejected, (d) oversized WebP rejected. Updated pre-existing `.bin` test to assert rejection instead of acceptance (it was relying on the buggy `&&` logic). All 20 test steps pass. Type-check clean. Lint: no new warnings.

