---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
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

- Decision: `UNREVIEWED`
- Notes:
