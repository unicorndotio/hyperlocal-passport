---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: lib/storage.ts
line: 141
severity: low
author: claude-code
provider_ref:
---

# Issue 006: Image optimization runs fire-and-forget — images served at full size until background compression completes

## Review Comment

After writing the uploaded file to disk, `uploadFile()` fires the optimization
task in the background and returns the filename immediately:

```ts
// lib/storage.ts ~line 141
// Fire-and-forget optimization for JPEG/PNG images
if (isImage && !options?.skipOptimization) {
  void optimizeImage(uploadsDir, filename)   // ← background, not awaited
}

// Persist access control metadata in PostgreSQL
await db.insert(schema.fileMetadata).values({ ... })

return filename   // ← returned before optimization finishes
```

The handler in `routes/api/posts/index.ts` immediately constructs an `imageUrl`
from this filename and stores it in the database:

```ts
const filename = await uploadFile(imageFile, { isPublic: true })
const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8000'
imageUrl = `${baseUrl}/api/uploads/${filename}`
```

The MV is then refreshed and the feed response includes this URL. Any client that
loads the feed before `optimizeImage()` completes (typically within a few hundred
milliseconds) will receive the full-size image. On a slow server or under load,
this window could be several seconds.

The PRD states: "Merchant image uploads must be automatically compressed and
optimized on upload." The TechSpec's risk table lists "Merchant image uploads bloat
page weight — Medium" and the mitigation is "Auto-compress images on upload; lazy-load
all feed images." The fire-and-forget approach is at odds with both.

**Practical impact:** On a mobile connection, a 5MB JPEG will be downloaded by the
resident before the server has had a chance to compress it to ~100-200KB. This is
most likely to happen immediately after post creation, when the merchant's own
browser refreshes the feed.

**Fix:** Await the optimization before returning:

```ts
// lib/storage.ts
if (isImage && !options?.skipOptimization) {
  await optimizeImage(uploadsDir, filename)   // ← await
}
```

`optimizeImage()` already has try/catch internally and logs errors — awaiting it
will not cause the upload to fail if compression fails. The only trade-off is slightly
higher POST handler latency (typically 50–200ms for a JPEG resize). This is
acceptable given the PRD's constraint that upload optimization happens "on upload."

## Triage

- Decision: `VALID`
- Notes: `optimizeImage()` has internal try/catch that silently handles errors — awaiting it is safe and will not cause `uploadFile()` to throw on compression failure. The latency trade-off (~50–200ms for JPEG resize) is acceptable per PRD requirement that optimization happens "on upload." All existing tests use `skipOptimization: true` for image uploads, so no test changes are required.

