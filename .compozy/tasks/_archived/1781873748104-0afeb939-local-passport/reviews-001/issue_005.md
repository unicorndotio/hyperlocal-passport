---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: resolved
file: routes/api/businesses/register.ts
line: 79
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: TOCTOU race window on duplicate email/CNPJ detection

## Review Comment

The email and CNPJ uniqueness checks (lines 79–87) are done as separate `kv.get()` calls before the final atomic commit. Two concurrent registration requests with the same email can both see `null` and proceed. While `auth.api.signUpEmail` likely enforces its own uniqueness (mitigating the email case), the CNPJ uniqueness is only enforced by the manual `businesses_by_cnpj` index — and the final `kv.atomic()` does not use `.check()` to verify the CNPJ key is still absent at commit time.

This means two concurrent registrations with the same CNPJ can both succeed. The second commit silently overwrites the `businesses_by_cnpj` index, leaving the first business unfindable by CNPJ lookup. Both business records and user accounts exist, creating data inconsistency.

**Fix:** Pass the `businesses_by_cnpj` entry through `.check()` in the atomic commit:

```ts
const cnpjEntry = await kv.get(['businesses_by_cnpj', cnpj])
if (cnpjEntry.value !== null) {
  return json({ error: 'CNPJ already registered' }, 409)
}

// Later, in the atomic block:
const result = await kv.atomic()
  .check(cnpjEntry)  // verifies CNPJ is still absent
  .set(['businesses', businessId], business)
  .set(['businesses_by_cnpj', cnpj], businessId)
  .commit()
```

If `.check()` fails, the commit returns `{ ok: false }` and the 500 error path handles cleanup.

## Triage

- Decision: `VALID`
- Root cause: `kv.atomic()` at line 143 does not use `.check(existingCnpj)` to verify the `businesses_by_cnpj` key is still absent at commit time. Two concurrent requests with the same CNPJ can both pass the `kv.get()` null check and both successfully commit their `set()` — the second silently overwrites the index entry.
- Fix: Pass `existingCnpj` (the result of `kv.get(['businesses_by_cnpj', cnpj])`) through `.check()` in the atomic chain. If the key was taken between the read and the commit, the check fails, `result.ok` is `false`, and the existing cleanup + 500 path handles it correctly.
- Email case is already mitigated by `auth.api.signUpEmail` enforcing uniqueness server-side (caught via `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`), so only the CNPJ index needs `.check()`.
