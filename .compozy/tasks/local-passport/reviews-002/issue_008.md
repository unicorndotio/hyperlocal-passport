---
provider: manual
pr:
round: 2
round_created_at: 2026-06-05T05:12:23Z
status: resolved
file: routes/api/admin/approvals/[userId].ts
line: 82
severity: medium
author: claude-code
provider_ref:
---

# Issue 008: Explicit role setting in approval auth bridge

## Review Comment

In the approval flow, the Better Auth account is created using `signUpEmail`, but it does not explicitly set the user's role.

```typescript
await auth.api.signUpEmail({
  body: {
    email: user.email,
    password: (user.cpf as string) || 'Pass@123',
    name: user.name,
  },
})
```

While Better Auth might default to a value, the PRD explicitly states these users are "residents". To ensure proper Role-Based Access Control (RBAC), the role should be explicitly passed in the signup data.

**Suggested Fix:**
Pass `role: 'resident'` in the `signUpEmail` body (or the corresponding field defined in `lib/auth.ts`).

```typescript
await auth.api.signUpEmail({
  body: {
    email: user.email,
    password: (user.cpf as string) || 'Pass@123',
    name: user.name,
    role: 'resident', // Explicitly set role
  },
})
```

## Triage

- Decision: `VALID`
- Notes: The current implementation in `routes/api/admin/approvals/[userId].ts` fails to explicitly set the user's role to 'resident' when creating the Better Auth account. This is required for proper RBAC as per the PRD. I will add the `role` field to the `signUpEmail` call.
