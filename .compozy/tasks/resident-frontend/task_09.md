---
status: completed
title: 'Feed image optimization pipeline'
type: backend
complexity: low
dependencies:
    - task_05
---

# Task 09: Feed image optimization pipeline

## Overview

Add automatic image compression and optimization for merchant-uploaded feed images. This prevents large image files from slowing down feed loading times and ensures a smooth experience even on slow mobile connections.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST compress merchant-uploaded images during the upload pipeline in `lib/storage.ts`
- MUST limit uploaded images to a maximum dimension (e.g., 1200px wide) and file size
- MUST preserve the original filename and metadata in the `file_metadata` table
- MUST support JPEG and PNG input formats
- MUST be non-blocking — the upload response should not wait for optimization to complete (fire-and-forget or background job)
</requirements>

## Subtasks

- [ ] 09.1 Research image compression approach (sharp via npm or Deno-native canvas API)
- [ ] 09.2 Implement image resize/compress in the upload pipeline
- [ ] 09.3 Add file type and size validation
- [ ] 09.4 Write tests for the optimization pipeline

## Implementation Details

The existing `lib/storage.ts` handles file uploads to the local filesystem with metadata in `file_metadata`. Image optimization should be added as a step before the file is written to disk.

For Deno, use `sharp` via npm or the built-in `Image` API. The approach should:
1. Detect image MIME type from upload
2. Resize to max 1200px width (maintaining aspect ratio)
3. Compress JPEG to 80% quality, PNG to pngquant-equivalent
4. Write the optimized buffer to disk

If sharp is unavailable or adds complexity, a simpler approach is to reject files over a size threshold (e.g., 5MB) and rely on client-side compression guidance.

### Relevant Files

- `lib/storage.ts` — Add image compression before file write
- `routes/api/uploads/[filename].ts` — Image serving (already exists)
- `deno.json` — May need to add sharp or image library dependency

### Dependent Files

- `routes/api/posts/index.ts` — Uploads images via storage.ts (task_05)

### Related ADRs

- No specific ADRs for this task

## Deliverables

- Image compression integration in upload pipeline
- File type and size validation
- Tests for compression and validation
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] Uploaded JPEG image is compressed and resized to max dimensions
  - [ ] Uploaded PNG image is compressed
  - [ ] Oversized image is rejected with descriptive error
  - [ ] Non-image file (e.g., PDF) passes through without compression
  - [ ] Image metadata (filename, mimetype) is preserved in the database
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Merchant images are automatically compressed on upload
- Feed page loads images efficiently
