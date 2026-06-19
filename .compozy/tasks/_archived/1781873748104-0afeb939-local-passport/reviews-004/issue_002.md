---
provider: manual
pr:
round: 4
round_created_at: 2026-06-11T01:43:13Z
status: resolved
file: routes/api/businesses/register.ts
line: 157
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Cleanup on atomic commit failure leaves orphan user records

## Review Comment

When the atomic commit at line 150–154 fails (e.g., due to a concurrent registration with the same CNPJ), the cleanup block at lines 157–161 attempts to undo the user created via `auth.api.signUpEmail()` at line 111:

```ts
await Promise.allSettled([
  deleteFile(logoFilename),
  kv.delete(['user', userId]),
  kv.delete(['users_by_email', normalizedEmail]),
])
```

The problem is that Better Auth manages its own KV key namespace internally. The cleanup deletes `['user', userId]` and `['users_by_email', normalizedEmail]`, but Better Auth does not use these key patterns for its internal storage — it uses its own schema (likely `['_better_auth', ...]` prefixes or different key structures). Therefore, these `kv.delete()` calls do not actually remove the Better Auth user record.

This means that when a race condition causes `kv.atomic().check(existingCnpj).set(...).commit()` to return `result.ok === false`, the user (created via `auth.api.signUpEmail`) persists as an orphan: the user has role='business' but no `businesses_by_cnpj` index or business profile linking to them.

**Impact:** Orphan user records accumulate slowly over time under concurrent registration load. These users would see a "business" role but no associated business if they log in. The registration form already validated CNPJ uniqueness before the atomic commit, so this race is only triggered by near-simultaneous duplicate CNPJ submissions — a rare edge case.

**Suggested fix:** Instead of trying to clean up KV keys manually, use Better Auth's API to delete the user:

```ts
if (!result.ok) {
  await Promise.allSettled([
    deleteFile(logoFilename),
    auth.api.deleteUser?.({ body: { userId } }),
  ])
  return json({ error: 'Conflict or system error, please retry' }, 500)
}
```

If Better Auth does not expose a delete user API, store the created user ID in a temporary key and implement a cleanup cron or accept the orphan as a known trade-off. Alternatively, reverse the operation order — write the business record atomically first, then create the user — so a user creation failure rolls back cleanly without an atomic commit.

## Triage

- Decision: `VALID`
- Technical Analysis:
  - The reviewer's concern is correct: the cleanup block at lines 157-161 does not fully remove Better Auth records, but the analysis is partially inaccurate.
  - **`['user', userId']` IS correct** — the KV adapter stores user records at `[model, id]` which is `['user', userId]`. Deleting this primary key does remove the Better Auth user record from KV.
  - **`['users_by_email', ...]` (plural) is WRONG** — the adapter creates indexes as `['user_by_email', ...]` (singular, based on `${model}_by_${field}`). The cleanup deletes a key that was never created.
  - **Account model not cleaned up** — `signUpEmail` also creates an `account` record linking the email/password credential. The cleanup never touches the `account` model, leaving orphan `['account', *]` and `['account_by_userId', *]` entries.
  - **Duplicate email check at line 86 also uses wrong key** — `['users_by_email', ...]` (plural) should be `['user_by_email', ...]` (singular) to match Better Auth's index.
  - The suggested `auth.api.deleteUser({ body: { userId } })` would not work directly — `deleteUser` requires an authenticated session and does not accept `userId` in its body schema.
  - **Fix approach**: Use direct `kv.delete()` with correct key patterns (`['user_by_email', email]` singular) and add `['account_by_userId', userId]` cleanup. Direct deletes were preferred over the adapter to avoid issues with atomic operation mocking in tests.
