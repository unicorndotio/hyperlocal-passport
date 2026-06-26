---
status: completed
title: User Redemptions & Upload Routes
type: backend
complexity: low
dependencies:
  - task_02
  - task_03
  - task_04
---

# User Redemptions & Upload Routes

## Overview

Migrate the user's own redemptions listing route and the file upload access control route from Deno KV to Drizzle. These are read-dominant routes with simple query patterns — user redemptions listing filters by `userId`, and upload access control looks up `file_metadata` by filename.

<critical>

- Read the TechSpec ("API Endpoints" section) for query mapping patterns
- These routes are straightforward KV→Drizzle replacements with no atomic operations
- Tests required: user redemptions listing, file upload access control

</critical>

<requirements>

1. `routes/api/users/me/redemptions.ts` MUST replace `kv.list({ prefix: ['user_redemptions', userId] })` with `db.select().from(redemptions).where(eq(redemptions.userId, userId))`.
2. `routes/api/uploads/[filename].ts` MUST replace `kv.get(['file_metadata', filename])` with `db.select().from(fileMetadata).where(eq(fileMetadata.filename, filename))`.
3. Access control logic (checking `isPublic` and `userId` before returning file) MUST be preserved.
4. Both files MUST remove `kv` imports and add `db` and `schema` imports.
5. `deno check` MUST pass on both modified files.

</requirements>

## Subtasks

- [ ] Update `routes/api/users/me/redemptions.ts`: replace KV prefix scan with Drizzle query
- [ ] Update `routes/api/uploads/[filename].ts`: replace KV get with Drizzle query
- [ ] Remove `kv` imports; add `db` and `schema` imports
- [ ] Verify `deno check` on both modified files
- [ ] Update user redemptions test for PostgreSQL

## Implementation Details

### Relevant Files

- `routes/api/users/me/redemptions.ts` — modify KV prefix scan → Drizzle
- `routes/api/uploads/[filename].ts` — modify KV get → Drizzle
- `tests/user_redemptions_api.test.ts` — update test infrastructure

### Dependent Files

- `tests/storage.test.ts` — already updated in task_05

## Deliverables

- Updated `routes/api/users/me/redemptions.ts` with Drizzle query
- Updated `routes/api/uploads/[filename].ts` with Drizzle query
- User redemptions tests passing against PostgreSQL
- Upload access control tests passing against PostgreSQL

## Tests

### Unit Tests

- [ ] `deno check` on both modified route files passes with zero errors

### Integration Tests

- [ ] GET users/me/redemptions returns redemptions for the authenticated user
- [ ] GET users/me/redemptions returns empty list when user has no redemptions
- [ ] GET uploads/[filename] with public file returns the file
- [ ] GET uploads/[filename] with non-public file returns 403 for unauthorized user
- [ ] GET uploads/[filename] with non-public file returns file for the owning user
- [ ] GET uploads/[filename] with non-existent filename returns 404
- [ ] Redemption data returned includes coupon information via Drizzle relations

## Success Criteria

- User redemptions listing works against PostgreSQL
- Upload access control works against PostgreSQL
- `deno check` on both modified files exits 0
- Test coverage >=80%
