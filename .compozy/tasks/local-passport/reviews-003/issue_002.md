---
provider: manual
pr:
round: 3
round_created_at: 2026-06-05T07:35:00Z
status: resolved
file: lib/kv-adapter.ts
line: 6
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Unindexed `coupons.businessId` forces O(N) scan on business detail

## Review Comment

The `INDEXED_FIELDS` map in `lib/kv-adapter.ts` (line 6) does not include a `coupons` entry, so there is no secondary index for `coupons.businessId`. This means every lookup of coupons by business falls back to a full O(N) KV scan.

Affected call sites:

- `routes/business/[id].tsx:25` — Scans ALL coupons in the database via `kv.list({ prefix: ['coupons'] })` to find those matching a businessId. This runs on every page load of the business detail page.
- `routes/api/businesses/[id]/coupons.ts:10` — Uses `adapter.findMany({ model: 'coupons', where: [{ field: 'businessId', value: businessId }] })`, which the adapter resolves via O(N) scan because no index exists.

As the number of coupons grows, every visit to a business detail page becomes slower. This is a performance bottleneck visible to users (the page load for a business with few coupons still pays the cost of scanning all coupons in the system).

**Suggested Fix:**
Add `coupons: ['businessId']` to the `INDEXED_FIELDS` map in `kv-adapter.ts`. This is a one-line change that makes coupon-by-business lookups O(1). No schema migration is needed — the index is built incrementally as coupons are created.

```typescript
const INDEXED_FIELDS: Record<string, string[]> = {
  user: ['email', 'cpf'],
  session: ['token', 'userId'],
  account: ['userId', 'providerId'],
  businesses: ['userId'],
  coupons: ['businessId'],  // Add this line
}
```

Also consider updating the `kv.list` call in `routes/business/[id].tsx:25` to use the adapter's `findMany` with the indexed where clause, or restructure the coupon key to `["coupons", businessId, couponId]` for native prefix filtering.

## Triage

- Decision: `VALID`
- Notes: Added `coupons: ['businessId']` to INDEXED_FIELDS in lib/kv-adapter.ts. Updated routes/business/[id].tsx to use adapter.findMany with indexed lookup instead of raw kv.list scan. Verified with `tests/kv_adapter_indexes.test.ts` and `tests/business_api.test.ts` (both pass).
