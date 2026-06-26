---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/admin/signals/index.ts
line: 43
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: Performance bottleneck from N+1 query loop on category counts

## Review Comment

In [routes/api/admin/signals/index.ts](file:///Users/dev/nodo/passport/deno/routes/api/admin/signals/index.ts#L43-L65), the `getCategoryCounts()` function executes a database query sequentially inside a `for...of` loop over `VALID_CATEGORIES`. This leads to an N+1 query pattern where a separate query is sent to the database for every single category.

### Suggested Fix

Perform a single aggregation query grouped by category instead:

```ts
    const counts = await db
      .select({
        category: schema.signals.category,
        total: sql<number>`count(*)::int`,
        unreviewed: sql<number>`count(*) filter (where ${schema.signals.status} = 'pending')::int`,
      })
      .from(schema.signals)
      .groupBy(schema.signals.category)
```

## Triage

- Decision: `valid`
- Root cause: `getCategoryCounts()` ran a separate DB query per category in a `for...of` loop over `VALID_CATEGORIES` (7 categories = 7 queries).
- Fix: Replaced N+1 loop with a single aggregation query using `GROUP BY schema.signals.category`. Uses `count(*)` and `count(*) filter (where status = 'pending')` to compute total and unreviewed counts per category in one round trip.
- No test changes needed: the returned data shape (`count`, `unreviewed`, `category`) is identical, categories with zero signals are absent in both old and new implementations.
- Removed unused imports: `eq` from drizzle-orm, `VALID_CATEGORIES` from lib/signals.ts.
