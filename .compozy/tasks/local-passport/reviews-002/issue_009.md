---
provider: manual
pr:
round: 2
round_created_at: 2026-06-05T05:12:23Z
status: resolved
file: routes/api/users/register.ts
line: 95
severity: medium
author: claude-code
provider_ref:
---

# Issue 009: Missing atomic email uniqueness check in registration

## Review Comment

The registration flow currently only checks for CPF uniqueness atomically.

```typescript
const existing = await kv.get(['users_by_cpf', cpf])
if (existing.value !== null) {
  return json({ error: 'CPF already registered' }, 409)
}
...
.check(existing)
```

However, it does not check for email uniqueness before attempting to save. While Better Auth will eventually reject a duplicate email during the approval phase, a pre-check during registration prevents the creation of duplicate resident profiles and orphaned files for an email that is already in use.

**Suggested Fix:**
Add a secondary index for `users_by_email` and include a `.check()` for it in the atomic registration transaction, similar to how CPF is handled.

## Triage

- Decision: `VALID`
- Notes: The registration flow in `routes/api/users/register.ts` does not check for email uniqueness, which could lead to duplicate resident profiles and orphaned uploads. I will implement a check for `users_by_email` in the atomic transaction, similar to the existing CPF check. This will involve updating the manual index management in the registration handler.
