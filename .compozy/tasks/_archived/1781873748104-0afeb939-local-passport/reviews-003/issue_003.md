---
provider: manual
pr:
round: 3
round_created_at: 2026-06-11T01:00:00Z
status: resolved
file: routes/api/businesses/[id]/profile.ts
line: 136
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Profile update atomic commit lacks .check() for concurrent write safety

## Review Comment

The profile update in `routes/api/businesses/[id]/profile.ts` (line 136–138) uses `kv.atomic().set().commit()` without a `.check()` for the business entry:

```ts
const updated = { ...business, ...updateData }
const result = await kv.atomic()
  .set(['businesses', businessId], updated)
  .commit()
```

Without `.check(bizEntry)`, two concurrent profile update requests (e.g., the business owner has two browser tabs open and saves simultaneously) can silently overwrite each other. If tab A changes the description and tab B changes the opening hours, both Atomic reads the original KV entry, both merge their changes in-memory, and whichever commits last wins — the first commit's changes are lost with no error or retry mechanism.

The self-service registration endpoint (`register.ts:150–153`) and admin toggle (`toggle.ts:24–28`) both use `.check()` correctly for their atomic writes, making this omission an inconsistency in the codebase.

**Fix:** Add a `.check(bizEntry)` to the atomic chain:

```ts
const bizEntry = await kv.get<Record<string, unknown>>([
  'businesses', businessId,
])
// ... (existing code)

const updated = { ...bizEntry.value, ...updateData }
const result = await kv.atomic()
  .check(bizEntry)
  .set(['businesses', businessId], updated)
  .commit()
```

## Triage

- Decision: `valid`
- Root cause: The atomic chain at line 136–138 lacked `.check(bizEntry)`, allowing concurrent profile update requests to silently overwrite each other's changes. Two concurrent reads of the same KV entry would both merge their updates in-memory, and the last `.commit()` would win — losing the first update with no error or retry.
- Fix applied: Added `.check(bizEntry)` to the atomic chain in `profile.ts:137`. The `bizEntry` was already read at line 16–19 via `kv.get()` and was in scope. This makes the atomic operation fail with `result.ok === false` if the KV entry was modified between the read and the write, consistent with `register.ts` and `toggle.ts`.
- Test added: Added "atomic check rejects stale versionstamp from concurrent write" test in `profile_test.ts` that reads the entry twice, commits the first (succeeds), then commits the second with the stale versionstamp (fails with `ok: false`), verifying the first write's value is preserved.
- Verification: `deno fmt --check .` (clean), `deno lint .` (clean), `deno test -A --unstable-kv` (110 passed, 0 failed).
