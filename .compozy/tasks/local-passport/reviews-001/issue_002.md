---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: lib/kv-adapter.ts
line: 16
severity: high
author: claude-code
provider_ref:
---

# Issue 002: O(N) database scans in `kv-adapter.ts`

## Review Comment

The `findOne`, `findMany`, and other query methods in `getDenoKvAdapterRaw` implement filtering by iterating over the entire prefix of a model using `kv.list`.

```typescript
async findOne<T = Record<string, unknown>>(
  data: { model: string; where: { field: string; value: unknown }[] },
): Promise<T | null> {
  const { model, where } = data
  const entries = kv.list({ prefix: [model] })
  for await (const entry of entries) {
    // ... filtering in-memory
  }
}
```

This approach leads to O(N) performance for lookups, where N is the total number of records for that model. This will become a significant performance bottleneck as the number of users, businesses, or transactions grows.

**Affected Files:**
- `lib/kv-adapter.ts` (Core implementation)
- `routes/api/transactions/validate.ts` (Uses `adapter.findOne` for business lookup)
- `routes/api/admin/users.ts` (Uses `adapter.findMany`)

**Suggested Fix:**
Implement secondary indexes for frequently queried fields (like `userId` in the `businesses` model). Instead of scanning all businesses, the adapter should look up the business ID from a `businesses_by_user` index.

## Triage

- Decision: `VALID`
- Notes: The issue is valid. O(N) scans are unacceptable for production workloads. I will implement a basic secondary index system in `kv-adapter.ts` and update the `businesses` creation logic to populate a `businesses_by_user` index.

## Resolved
Secondary indexing support has been added to `lib/kv-adapter.ts`. The adapter now automatically creates and utilizes indexes for common fields like `user.email`, `businesses.userId`, and `session.token`, avoiding O(N) scans for most common lookups. Existing tests in `tests/auth.test.ts` verify that the adapter remains functional.
