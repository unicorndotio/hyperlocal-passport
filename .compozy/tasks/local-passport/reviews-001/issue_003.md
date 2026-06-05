---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: routes/api/admin/users.ts
line: 10
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Inconsistent model naming between Admin API and Application logic

## Review Comment

There is a mismatch in the model naming (prefix) used for users between the Admin API and the registration/approval logic.

In `routes/api/admin/users.ts`:
```typescript
const users = await adapter.findMany({ model: 'user' })
```

In `routes/api/users/register.ts` and `routes/api/admin/approvals/[userId].ts`:
```typescript
.set(['users', userId], user)
const userEntry = await kv.get(['users', userId])
```

The application consistently uses the plural `users`, while `admin/users.ts` uses the singular `user`. This will result in the Admin User list always appearing empty, even when users are registered.

Additionally, Better Auth defaults to singular model names (`user`, `session`, `account`). This inconsistency might lead to further issues if the application tries to share data with the auth system.

**Suggested Fix:**
Standardize on one naming convention (plural or singular) across the entire codebase. Given the Better Auth integration, singular names might be more compatible, but the current app logic favors plural.

## Triage

- Decision: `VALID`
- Notes: The issue is valid. Inconsistent model naming leads to data silos. I will standardize on plural names (`users`) for application logic but ensure compatibility with Better Auth's expectations where necessary. I will update `admin/users.ts` to use `users`.

## Resolved
Model naming has been standardized to the singular `user` across the entire codebase (Registration, Approvals, and Admin API). This ensures consistency with Better Auth's default expectations and fixes the data silo issue in the Admin UI. All related tests in `tests/register.test.ts` and `tests/admin_approvals.test.ts` have been updated and pass.
