---
status: pending
title: Implement Storage Client (DigitalOcean Spaces)
type: infra
complexity: low
dependencies: []
---

# Task 02: Implement Storage Client (DigitalOcean Spaces)

## Overview
Creates a reusable client for interacting with DigitalOcean Spaces (S3 compatible) to store user documents and business logos outside the Deno KV limit.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST connect to an S3-compatible API using environment variables.
- MUST implement an `uploadFile` method that returns a public or pre-signed URL.
- MUST implement a `getPresignedUrl` method for securely viewing private documents.
</requirements>

## Subtasks
- [ ] 2.1 Add AWS S3 SDK for JS (or lightweight S3 fetch client) to `deno.json`.
- [ ] 2.2 Create `lib/storage.ts` with connection initialization.
- [ ] 2.3 Implement the upload functionality returning object keys.

## Implementation Details
Use standard S3 clients. Ensure credentials (Access Key, Secret Key, Endpoint, Bucket) are read from Deno environment variables. See TechSpec for ADR-003 constraints.

### Relevant Files
- `lib/storage.ts` — To be created.
- `deno.json` — Add S3 dependency.

### Dependent Files
- None.

### Related ADRs
- [ADR-003: Document Upload Storage](../adrs/adr-003.md)

## Deliverables
- Storage utility functions.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for file upload **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `uploadFile` calls S3 client with correct parameters.
  - [ ] `getPresignedUrl` returns a properly formatted URL.
- Integration tests:
  - [ ] Can successfully upload a small buffer to a mocked/test S3 bucket.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Files can be uploaded and retrieved programmatically.
