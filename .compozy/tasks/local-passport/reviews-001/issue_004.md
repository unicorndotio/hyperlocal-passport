---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/businesses/register.ts
line: 140
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Orphaned `users_by_email` index on atomic commit rollback

## Review Comment

When the final `kv.atomic()` commit fails (line 135–138 — which can happen under concurrent writes), the rollback path (lines 140–146) deletes the user record key `['user', userId]` and the uploaded logo file, but does **not** clean up the `users_by_email` and `users_by_cpf` secondary indexes that `auth.api.signUpEmail` created through the KV adapter.

This leaves the email index pointing to a deleted user. Any subsequent registration attempt with the same email gets `"Email already registered"` (from the `users_by_email` check at line 79), but the user record doesn't exist — creating a permanent dead end that requires manual KV admin intervention to resolve.

**Fix:** Clean up the email and CPF secondary indexes in the rollback path:

```ts
if (!result.ok) {
  await Promise.allSettled([
    deleteFile(logoFilename),
    kv.delete(['user', userId]),
    kv.delete(['users_by_email', normalizedEmail]),
    cpf ? kv.delete(['users_by_cpf', cpf]) : Promise.resolve(),
  ])
  return json({ error: 'Conflict or system error, please retry' }, 500)
}
```

Alternatively, use a `kv.atomic()` for the rollback operations so they are applied atomically.

## Triage

- Decision: `UNREVIEWED`
- Notes:
