---
provider: manual
pr:
round: 2
round_created_at: 2026-06-26T14:55:00Z
status: resolved
file: routes/api/admin/approvals/[userId].ts
line: 96
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Typecheck failure user type narrowed to never in approvals API

## Review Comment

In [routes/api/admin/approvals/[userId].ts](file:///Users/dev/nodo/passport/deno/routes/api/admin/approvals/[userId].ts#L96-L98), the `user` variable is typed as `User | null` but gets narrowed to `never` because it is assigned inside the closure of `db.transaction(async (tx) => { ... })`. The TypeScript compiler is unable to determine that the transaction callback runs synchronously and therefore infers `user` as strictly `null` (and thus `never` inside the `if (status === 'approved' && user)` check).

### Suggested Fix

Return the user object directly from the transaction call or type-assert the user variable, for example:

```ts
    const updatedUser = await db.transaction(async (tx) => {
      // ...
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        cpf: dbUser.cpf || undefined,
        status: status as 'pending' | 'approved' | 'rejected',
      }
    })
```

## Triage

- Decision: `valid`
- Notes: TypeScript control flow analysis cannot track assignment through the `db.transaction(async (tx) => { ... })` closure callback. Line 42 declares `let user: User | null = null`, and the assignment at line 58 happens inside the callback. After the `await db.transaction(...)`, TypeScript still considers `user` as potentially `null` but can't prove the assignment occurred through the closure, narrowing `user` to `never` at the `if (status === 'approved' && user)` guard on line 92. This is confirmed by `deno task type-check` producing TS2339 errors on `user.email`, `user.cpf`, and `user.name` at lines 96-98.

Fix: Return the user object directly from the `db.transaction` callback instead of assigning to an outer `let` variable. This eliminates the closure-assignment pattern and lets TypeScript properly infer the type from the return value of `db.transaction()`.
