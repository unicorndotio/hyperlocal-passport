---
status: completed
title: File Metadata Migration
type: backend
complexity: low
dependencies:
    - task_02
    - task_03
---

# File Metadata Migration

## Overview

Migrate file metadata storage from Deno KV to the `file_metadata` PostgreSQL table while keeping file uploads on the local filesystem unchanged. The `lib/storage.ts` module replaces `kv.set` and `kv.delete` calls with Drizzle `db.insert` and `db.delete` queries against the `file_metadata` table.

<critical>

- Read the TechSpec ("Integration Points — File Storage" section) before implementing
- Reference TechSpec for the exact column mapping: filename, userId, isPublic, uploadedAt
- No changes to the file upload/delete filesystem logic
- Tests required: file upload creates metadata row, file delete removes metadata row, access control queries work

</critical>

<requirements>

1. `lib/storage.ts` MUST replace `kv.set(['file_metadata', filename], { userId, isPublic })` with `db.insert(schema.fileMetadata).values(...)`.
2. `lib/storage.ts` MUST replace `kv.delete(['file_metadata', filename])` with `db.delete(schema.fileMetadata).where(eq(schema.fileMetadata.filename, filename))`.
3. The `kv` import MUST be removed from `lib/storage.ts` and replaced with `db` import from `../lib/db.ts`.
4. File uploads to the local filesystem (`UPLOADS_DIR`) MUST remain unchanged.
5. The `file_metadata` table lookup (used in `routes/api/uploads/[filename].ts`) MUST use Drizzle `db.select` instead of `kv.get`.
6. Access control logic (checking `isPublic` and `userId` before returning file) MUST be preserved.

</requirements>

## Subtasks

- [ ] Update `lib/storage.ts` imports (remove `kv`, add `db` and `schema`)
- [ ] Replace `kv.set` in `uploadFile` with `db.insert(schema.fileMetadata).values(...)`
- [ ] Replace `kv.delete` in `deleteFile` with `db.delete(schema.fileMetadata).where(...)`
- [ ] Update `routes/api/uploads/[filename].ts` to use Drizzle query instead of `kv.get`
- [ ] Verify `deno check lib/storage.ts`
- [ ] Test file upload creates metadata row in PostgreSQL
- [ ] Test file delete removes metadata row

## Implementation Details

### Relevant Files

- `lib/storage.ts` — modify KV operations → Drizzle operations
- `routes/api/uploads/[filename].ts` — modify KV lookup → Drizzle query

### Dependent Files

- `tests/storage.test.ts` — tests will be updated in this task

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)

## Deliverables

- Updated `lib/storage.ts` with Drizzle inserts/deletes for file metadata
- Updated `routes/api/uploads/[filename].ts` with Drizzle metadata lookup
- File upload creates metadata row in `file_metadata` table
- File delete removes metadata row
- Access control preserves `isPublic`/`userId` check behavior
- Filesystem storage unchanged

## Tests

### Unit Tests

- [ ] `deno check lib/storage.ts` passes with zero type errors
- [ ] `deno check routes/api/uploads/[filename].ts` passes

### Integration Tests

- [ ] Uploading a file creates a `file_metadata` row with correct filename, userId, and isPublic default
- [ ] Uploading a file with `isPublic: true` creates metadata row with `is_public = true`
- [ ] Deleting a file removes its `file_metadata` row
- [ ] Accessing a public file via uploads route returns the file
- [ ] Accessing a non-public file without authentication returns 401/403
- [ ] Uploading a file with duplicate filename correctly enforces unique constraint
- [ ] Filesystem file persists after metadata operations (file and metadata are independent)

## Success Criteria

- `deno check lib/storage.ts && deno check routes/api/uploads/[filename].ts` exits 0
- All file metadata operations work against PostgreSQL
- File upload/download lifecycle is preserved
- Test coverage >=80%
