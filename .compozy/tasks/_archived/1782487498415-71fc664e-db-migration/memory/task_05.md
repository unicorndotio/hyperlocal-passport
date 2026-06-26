# Task Memory: task_05.md

## Objective Snapshot

File Metadata Migration: Migrate file metadata storage from Deno KV to PostgreSQL `file_metadata` table. File upload/delete filesystem logic unchanged. Must replace `kv.set`/`kv.delete` with Drizzle `db.insert`/`db.delete` in lib/storage.ts and routes/api/uploads/[filename].ts. Update tests to use database instead of KV.

## Important Decisions

1. **File ID generation**: Using UUID generated during upload as the `id` column in fileMetadata table (not filename). Filename remains unique indexed.
2. **userId field**: Set to `null` when not provided (options?.userId || null), instead of empty string. Database schema allows nullable userId.
3. **Test cleanup**: Switched from kv.list() iteration to db.delete() with WHERE clauses for test user cleanup. Simpler and consistent with database pattern.
4. **User status updates**: Tests now use db.update() to set role/status on existing Better Auth users, instead of kv.set() overwrite.

## Learnings

- fileMetadata table in schema.ts was already defined with correct columns: id, filename, userId, isPublic, uploadedAt
- Better Auth now uses Drizzle adapter (task_04 complete), so user sessions are in PostgreSQL, not KV
- All Drizzle imports need `import { eq } from 'npm:drizzle-orm@0.38.2'` for WHERE clauses
- Type checking passes for all three modified files and full project

## Files / Surfaces

**Modified:**
- lib/storage.ts: uploadFile and deleteFile now use db.insert/db.delete instead of kv.set/kv.delete
- routes/api/uploads/[filename].ts: handleGetUpload now uses db.select().from().where() instead of kv.get()
- tests/storage.test.ts: Complete refactor to use db and schema instead of kv for metadata operations

**Not modified (correct state):**
- db/schema.ts: fileMetadata table already properly defined
- lib/db.ts: Drizzle singleton already exists and working

## Errors / Corrections

None during implementation. All type checks pass on first attempt.

## Ready for Next Run

Task_05 is complete. All code changes implemented, type-checked, and tests updated. No automatic commit (disabled). Ready for manual review and commit. Task_06 (User Registration & Approval Routes) can proceed when this is merged.
