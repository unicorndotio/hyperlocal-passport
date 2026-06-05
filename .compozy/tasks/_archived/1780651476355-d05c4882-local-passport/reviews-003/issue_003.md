---
provider: manual
pr:
round: 3
round_created_at: 2026-06-05T07:35:00Z
status: resolved
file: routes/api/users/register.ts
line: 10
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Route files open independent KV connections instead of shared singleton

## Review Comment

Several route files declare their own `Deno.openKv()` instance at module level instead of importing the shared singleton from `lib/kv.ts`:

- `routes/api/users/register.ts:10` — `const kv = await Deno.openKv()`
- `routes/api/admin/approvals/[userId].ts:4` — `const kv = await Deno.openKv()`
- `routes/api/admin/approvals/pending.ts:3` — `const kv = await Deno.openKv()`
- `routes/api/uploads/[filename].ts:5` — `const kv = await Deno.openKv()`
- `routes/api/businesses/index.ts:6` — `const kv = await Deno.openKv()`
- `routes/api/businesses/[id].ts:6` — `const kv = await Deno.openKv()`
- `routes/api/businesses/[id]/coupons.ts:4` — `const kv = await Deno.openKv()`
- `routes/business/coupons.tsx:14` — `const kv = await Deno.openKv()`
- `routes/business/checkout.tsx:14` — `const kv = await Deno.openKv()`

Meanwhile, `lib/kv.ts` already provides a shared singleton:
```typescript
export const kv = await Deno.openKv()
```

And some files do use it correctly — e.g., `routes/api/transactions/validate.ts` imports from `@/lib/kv.ts`.

Using the shared singleton has two benefits: (1) it avoids creating multiple Deno KV connections to the same database file, which can cause resource contention under load; (2) it centralizes the KV configuration (path, options) so changes don't need to be replicated across a dozen files.

**Suggested Fix:**
Replace `const kv = await Deno.openKv()` with `import { kv } from '../../lib/kv.ts'` (using the correct relative path) in each affected file. Remove the local `Deno.openKv()` declaration. Files that already import the singleton for other purposes simply need to use the shared `kv` instead of their local one.

## Triage

- Decision: `VALID`
- Notes: Replaced `const kv = await Deno.openKv()` with `import { kv } from '...'` across all 9 affected route files. Verified with `tests/admin_approvals.test.ts`, `tests/business_api.test.ts`, `tests/register.test.ts`, `tests/coupon_engine.test.ts`, `tests/coupon_redeem_api.test.ts` (all pass). All route files now use the shared singleton from lib/kv.ts.
