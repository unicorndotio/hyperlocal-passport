---
provider: manual
pr:
round: 3
round_created_at: 2026-06-05T07:35:00Z
status: resolved
file: routes/api/admin/approvals/[userId].ts
line: 65
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Auth account created outside atomic transaction in approval handler

## Review Comment

In `routes/api/admin/approvals/[userId].ts`, the Better Auth account creation (`auth.api.signUpEmail`) at line 65 is called **before** the `kv.atomic().commit()` at line 82. If the atomic commit fails (e.g., due to a concurrent status change caught by the `.check(userEntry)` guard), there is no rollback mechanism for the already-created Better Auth account.

```typescript
// Line 65: Auth account created HERE
await auth.api.signUpEmail({
  body: {
    email: user.email,
    password: (user.cpf as string) || 'Pass@123',
    name: user.name,
    role: 'resident',
  },
})
// ... more logic ...
// Line 82: Atomic commit HERE — can fail!
const result = await atomic.commit()
if (!result.ok) {
  return new Response(
    JSON.stringify({ error: 'Failed to update user status' }),
    { status: 500 },
  )
}
```

This means an orphaned Better Auth account exists with no corresponding application-level user record, leaving an unrecoverable state. The affected user will not appear in the approvals list (the pending key was not deleted since the transaction failed), but the email is now taken in Better Auth, preventing future approval.

**Suggested Fix:**
Invert the order: perform the atomic commit first, then create the Better Auth account only after confirming the commit succeeded. If the signup fails after the commit, the user record can be reverted or left in a retryable state.

```typescript
const result = await atomic.commit()
if (!result.ok) {
  return new Response(
    JSON.stringify({ error: 'Failed to update user status' }),
    { status: 500 },
  )
}

// Only create Auth account after confirming the KV commit succeeded
if (status === 'approved') {
  try {
    await auth.api.signUpEmail({
      body: {
        email: user.email,
        password: (user.cpf as string) || 'Pass@123',
        name: user.name,
        role: 'resident',
      },
    })
  } catch (err) {
    // Log and return success — the user record exists, auth can be retried
    console.warn(
      `Auth account creation failed after approval:`,
      err,
    )
  }
}
```

## Triage

- Decision: `VALID`
- Notes: Fixed by moving `auth.api.signUpEmail()` after `atomic.commit()` and the ok check. Verified with `tests/admin_approvals.test.ts` (2 passed, 16 steps).
