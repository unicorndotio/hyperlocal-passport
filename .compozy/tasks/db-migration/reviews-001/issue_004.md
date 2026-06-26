---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/businesses/[id]/analytics.ts
line: 48
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Performance bottleneck from N+1 query loop and in-memory sorting/slicing

## Review Comment

In [routes/api/businesses/[id]/analytics.ts](file:///Users/dev/nodo/passport/deno/routes/api/businesses/[id]/analytics.ts#L48-L82), the handler queries the database in a loop for each coupon's analytics (`Promise.all` mapping `db.select().from(schema.couponAnalytics)`). If a business has many coupons, this triggers an N+1 query pattern.
Additionally, the transaction history loads all records into memory from the database, sorts them using Javascript's `Array.prototype.sort()` (line 73), and performs pagination slicing in memory (line 82) rather than letting PostgreSQL perform these operations.

### Suggested Fix

1. Retrieve coupon analytics in a single SQL join query when fetching coupons, or use a bulk query with the `inArray` operator.
2. Delegate sorting and pagination to the database using `orderBy(desc(schema.transactions.timestamp))`, `limit()`, and `offset()`.

```ts
    const transactionPage = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.businessId, businessId))
      .orderBy(desc(schema.transactions.timestamp))
      .limit(limit)
      .offset(offset)
```

## Triage

- Decision: `valid`
- Notes: Two performance issues confirmed. (1) Lines 48-64: N+1 query pattern — each coupon's analytics is fetched individually via `Promise.all(db.select().from(schema.couponAnalytics).where(eq(...)))`. Fixed by using `inArray` bulk query with Map lookup. (2) Lines 66-82: All transactions loaded into memory, sorted in JS, and paginated with `.slice()`. Fixed by delegating `ORDER BY DESC`, `LIMIT`, `OFFSET` to PostgreSQL with a separate `count(*)` for total.
