---
provider: manual
pr:
round: 2
round_created_at: 2026-06-11T00:43:51Z
status: pending
file: lib/storage.ts
line: 3
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Storage module opens independent KV instance, breaking file access control in production

## Review Comment

`lib/storage.ts` (line 3) opens its own KV connection via `const kv = await Deno.openKv()` using no arguments, while the rest of the application uses the shared instance from `lib/kv.ts` which reads `Deno.env.get('DENO_KV_PATH')`:

```ts
// lib/kv.ts — shared instance
export const kv = await Deno.openKv(Deno.env.get('DENO_KV_PATH'))

// lib/storage.ts — separate instance
const kv = await Deno.openKv()
```

When `DENO_KV_PATH` is configured (Docker/production deployment), these two calls open different KV databases. The `uploadFile` function writes `file_metadata` (access control entries) to the default database via storage.ts's private instance. However, `routes/api/uploads/[filename].ts` reads `file_metadata` from the shared instance (lib/kv.ts), which is the custom-path database. The metadata never arrives in the same database.

This means:
1. Every `file_metadata` lookup in the upload handler returns `null` in production.
2. `isPublic` defaults to `false`, so authentication is required for all file access.
3. `ownerId` defaults to `''`, so the owner-equality check (`ownerId && user.id === ownerId`) always evaluates to `false`.
4. Effectively, only admin users can access any uploaded file in production. Business owners cannot view their own logo or uploaded documents.

In development (no `DENO_KV_PATH` set), both calls default to the same database, so the bug is invisible during local testing.

**Fix:** Import and use the shared `kv` instance from `lib/kv.ts` instead of creating a separate connection:

```ts
import { kv } from './kv.ts'  // shared instance
```

Remove the local `const kv = await Deno.openKv()` declaration at the module level.

## Triage

- Decision: `UNREVIEWED`
- Notes:
