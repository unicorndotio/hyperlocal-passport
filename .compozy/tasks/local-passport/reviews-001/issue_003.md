---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/businesses/register.ts
line: 114
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Misleading error message on `auth.api.signUpEmail` failure

## Review Comment

The catch block at line 114–116 wraps every `auth.api.signUpEmail` failure into a single 409 response: `"Email already registered or system error"`. This is inaccurate for at least two scenarios:

1. **Invalid/weak password** — the auth library may reject the password, but the user sees "Email already registered."
2. **Transient server error** — the sign-up could fail due to a KV write conflict or network issue, but the user gets a 409 status implying a duplicate, not a 500.

This makes debugging difficult for business owners during self-registration and creates support tickets for non-existent duplicate-email issues.

**Fix:** Catch specific error types or inspect the error message to differentiate between actual duplicate email errors (which should return 409) and other failures (which should return a 500 with an appropriate message):

```ts
try {
  const { user } = await auth.api.signUpEmail({...})
  userId = user.id
} catch (err) {
  await deleteFile(logoFilename).catch(() => {})
  const message = err instanceof Error ? err.message : 'System error'
  if (message.toLowerCase().includes('email') && message.toLowerCase().includes('exist')) {
    return json({ error: 'Email already registered' }, 409)
  }
  return json({ error: `Registration failed: ${message}` }, 500)
}
```

## Triage

- Decision: `UNREVIEWED`
- Notes:
