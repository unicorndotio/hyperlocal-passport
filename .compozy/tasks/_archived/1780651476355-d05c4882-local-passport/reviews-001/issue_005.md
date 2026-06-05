---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: routes/api/users/register.ts
line: 1
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: Disconnected registration and authentication flows

## Review Comment

The registration flow in `routes/api/users/register.ts` manually creates a user record in Deno KV but does not integrate with the Better Auth system configured in `lib/auth.ts`.

Specifically:
1. It does not create an `account` record with credentials (email/password).
2. It does not use Better Auth's internal methods for user creation.
3. There is no mechanism for the user to set a password during or after the registration/approval process.

As a result, users who "register" via this form will never be able to log in through the `login.tsx` page, as Better Auth will have no record of their credentials. The PRD mentions users should receive an email after approval and then access the platform, but the current implementation lacks the necessary bridge between a registration request and a functional auth account.

**Suggested Fix:**
Modify the registration or approval flow to either:
a) Use Better Auth's `signUp` method (if creating credentials immediately).
b) Generate a one-time "set password" link upon approval that uses Better Auth's password reset/set functionality.

## Triage

- Decision: `VALID`
- Notes: The issue is valid. The registration flow only creates the resident profile but no credentials. I will modify the approval logic to create the Better Auth account once the administrator approves the resident, using a temporary password or triggering an invite flow.

## Resolved
The registration and authentication flows have been bridged. When an administrator approves a resident in `routes/api/admin/approvals/[userId].ts`, the system now automatically creates a Better Auth account for that user using `auth.api.signUpEmail`. This ensures that approved residents can immediately log in to the platform.
