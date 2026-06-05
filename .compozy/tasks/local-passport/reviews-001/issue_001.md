---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: routes/api/users/register.ts
line: 69
severity: critical
author: claude-code
provider_ref:
---

# Issue 001: Race condition in user registration (CPF uniqueness)

## Review Comment

The CPF uniqueness check in `handleRegister` is not atomic with the subsequent user creation. The code performs a `kv.get` to check for an existing CPF:

```typescript
const existing = await kv.get(['users_by_cpf', cpf])
if (existing.value !== null) {
  return json({ error: 'CPF already registered' }, 409)
}
```

And then commits the new user using `kv.atomic()`:

```typescript
const result = await kv.atomic()
  .set(['users', userId], user)
  .set(['users_by_cpf', cpf], userId)
  ...
  .commit()
```

If two concurrent requests arrive for the same CPF, both could pass the `kv.get` check before either has committed, leading to duplicate user records or inconsistent state where the `users_by_cpf` index only points to the last-committed user.

**Suggested Fix:**
Include a `.check(existing)` in the atomic operation to ensure the CPF record hasn't been created since it was read.

```typescript
const result = await kv.atomic()
  .check(existing) // Ensure versionstamp is null
  .set(['users', userId], user)
  .set(['users_by_cpf', cpf], userId)
  ...
  .commit()
```

## Triage

- Decision: `VALID`
- Notes: The issue is valid. Deno KV lookups followed by atomic commits without a `.check()` on the initial lookup result are subject to race conditions. I will add the `.check(existing)` to the atomic transaction in `handleRegister`.

## Resolved
The `.check(existing)` has been added to the `kv.atomic()` transaction in `routes/api/users/register.ts`, ensuring that the CPF remains unique even under high concurrency. Verification tests in `tests/register.test.ts` pass.
