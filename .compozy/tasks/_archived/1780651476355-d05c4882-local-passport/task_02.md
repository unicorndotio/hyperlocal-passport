---
status: completed
title: Implement Local Storage Client & Docker Setup
type: infra
complexity: medium
dependencies: []
completed_at: 2026-05-22T23:55:50-03:00
---

# Task 02: Implement Local Storage Client & Docker Setup

## Overview

Creates a local filesystem-based storage utility to save uploaded files (user
documents, business logos) on disk, sets up Deno Fresh custom routes to serve
them, and defines Docker containerization with persistent volumes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST write uploaded files to the local filesystem under the directory configured by `UPLOADS_DIR` (defaulting to `/app/uploads`).
- MUST implement `uploadFile` method in `lib/storage.ts` that saves a file/blob and returns its unique filename (e.g., `<uuid>.<ext>`).
- MUST implement custom API route handler in `routes/api/uploads/[filename].ts` to serve uploaded files securely, with authorization checks for sensitive documents (e.g., only Admin or the document owner can access resident files; business logos are public).
- MUST prefix the final file URLs returned/saved to KV using the `APP_BASE_URL` environment variable (e.g., `${APP_BASE_URL}/api/uploads/${filename}`).
- MUST containerize the app using a production-ready `Dockerfile` (pinning Deno version, caching dependencies, running as a non-root user).
- MUST set up container volumes in a `docker-compose.yml` to persist `/app/uploads` and Deno KV database file (e.g., mapped from `/app/data/passport.db` to host volume).
</requirements>

## Subtasks

- [x] 2.1 Create `Dockerfile` (using pinned Deno alpine image, non-root user,
      caching deno.json imports) and `docker-compose.yml` with port 8000
      exposed, mapped volumes for `/app/uploads` and Deno KV database file in
      `/app/data`.
- [x] 2.2 Create `lib/storage.ts` implementing `uploadFile` using Deno
      filesystem APIs, checking and creating `UPLOADS_DIR` if it doesn't exist,
      and returning a generated UUID filename.
- [x] 2.3 Create custom API route handler `routes/api/uploads/[filename].ts`
      that reads and streams files from `UPLOADS_DIR` with authorization/role
      checks (verifying the current session for private user documents).
- [x] 2.4 Add tests to verify file creation, secure random filename generation,
      custom route response streaming, and base URL resolution.

## Implementation Details

Implement file writing operations using `Deno.writeFile` or similar stream
operations. Ensure the uploads directory exists (using
`Deno.mkdir(..., { recursive: true })`) before writing. Set `UPLOADS_DIR` from
environment variables, defaulting to `/app/uploads`. The `Dockerfile` should be
based on `denoland/deno:alpine` or similar standard Deno images. The
`docker-compose.yml` should map the storage directories and Deno KV files to
persistent Docker host volumes. Custom route handler
`/api/uploads/[filename].ts` must parse the file extension to set correct
`Content-Type` headers, and use a stream body to return files efficiently.

### Relevant Files

- `lib/storage.ts` — To be created.
- `routes/api/uploads/[filename].ts` — To be created.
- `Dockerfile` — To be created.
- `docker-compose.yml` — To be created.
- `deno.json` — Add any UUID or path dependencies if needed.

### Dependent Files

- None.

### Related ADRs

- [ADR-006: Docker Containerization and Local File Storage](../adrs/adr-006.md)

## Deliverables

- Storage utility functions in `lib/storage.ts`.
- Custom route handler in `routes/api/uploads/[filename].ts`.
- `Dockerfile` and `docker-compose.yml`.
- Unit tests with 80%+ coverage for storage operations **(REQUIRED)**
- Integration tests verifying writing files to disk and streaming via API
  **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `uploadFile` correctly generates a random UUID filename.
  - [x] `uploadFile` rejects invalid file types or handles empty inputs.
- Integration tests:
  - [x] `uploadFile` successfully writes a file to the temporary test directory
        on the local filesystem.
  - [x] Custom uploads route returns correct headers and streams file contents
        correctly.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Files can be uploaded, stored outside the public directory, and retrieved via
  the secure API route.
