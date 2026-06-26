---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: tests/business_detail_page.test.ts
line: 65
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: Type safety bypass causing TS2769 compilation failures in test files

## Review Comment

In multiple test files—specifically [tests/business_detail_page.test.ts](file:///Users/dev/nodo/passport/deno/tests/business_detail_page.test.ts#L65-L68) and [tests/routes/api/admin/businesses/toggle_test.ts](file:///Users/dev/nodo/passport/deno/tests/routes/api/admin/businesses/toggle_test.ts#L46)—database inserts bypass TypeScript type-safety by casting helper function returns to `Record<string, unknown>`.
Drizzle ORM strictly types `.values()` using the table schema (e.g. `PgInsertValue<TTable>`). Casting values to `Record<string, unknown>` triggers type-checking failures (`TS2769: No overload matches this call`) when running `deno task test` or `deno task check`.

### Suggested Fix

Cast helper values to their inferred Drizzle insert type:

```ts
    await db.insert(schema.businesses).values(
      business as typeof schema.businesses.$inferInsert,
    )
```

Alternatively, type the `makeBusiness` and `makeCoupon` helper return types to match the database schemas instead of returning generic `Record<string, unknown>`.

## Triage

- Decision: valid
- Root cause: `makeBusiness` and `makeCoupon` return `Record<string, unknown>`, which is incompatible with Drizzle's typed `.values()` method. Every call site casts with `as Record<string, unknown>`, causing TS2769.
- Fix: Change return types to `typeof schema.businesses.$inferInsert` and `typeof schema.coupons.$inferInsert`, and remove all `as Record<string, unknown>` casts from insert calls.
```
