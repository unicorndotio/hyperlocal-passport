---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/catalog.tsx
line: 17
severity: low
author: claude-code
provider_ref:
---

# Issue 008: catalog.tsx fetches all active businesses then filters by category in-memory

## Review Comment

The catalog handler always fetches every active business from the database, then
applies the category filter in JavaScript:

```ts
// routes/catalog.tsx ~line 17
const rows = await db.select()
  .from(businesses)
  .where(eq(businesses.isActive, true))   // no category filter in SQL

// …
const url = new URL(ctx.req.url)
const category = url.searchParams.get('category')

let filtered = businessesList
if (category && category !== 'Todos') {
  filtered = businessesList.filter((b) => b.category === category)  // in-memory
}
```

At current MVP scale (tens of businesses) this is harmless.  As the catalog grows,
each page request performs an unbounded full-table scan regardless of whether the
user selected a specific category.  The category list is also built from the
already-fetched full set, which is the correct approach for populating the filter
chips — so two queries are justified.  However, the filtered results should come
from the database, not from memory.

**Fix:** Add the category `WHERE` clause to the Drizzle query when a specific
category is requested.  Keep the separate full query only for building the category
chips:

```ts
const allRows = await db.select({ category: businesses.category })
  .from(businesses)
  .where(eq(businesses.isActive, true))

const allCategories = ['Todos', ...new Set(allRows.map((r) => r.category))].sort()

const filteredRows = await db.select()
  .from(businesses)
  .where(
    category && category !== 'Todos'
      ? and(eq(businesses.isActive, true), eq(businesses.category, category))
      : eq(businesses.isActive, true),
  )
```

This adds one extra lightweight query (categories only) but keeps the main data
fetch properly bounded.

## Triage

- Decision: `VALID`
- Root cause: The catalog GET handler fetched all active businesses from the database, then filtered by category in-memory with `Array.filter()`. This performs an unbounded full-table scan regardless of whether the user selected a category.
- Fix: Split into two queries: (1) a lightweight query selecting only `category` for building the filter chips, and (2) the main business query with the category WHERE clause pushed to SQL via Drizzle's `and(eq(isActive, true), eq(category, selectedCategory))`. The existing integration tests (`mobile_catalog_integration.test.ts`) cover all scenarios (active-only, category filter, non-matching category, category chips) and pass without modification.
