---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/users/me/redemptions.ts
line: 17
severity: low
author: claude-code
provider_ref:
---

# Issue 008: In-memory status filtering instead of database query filtering

## Review Comment

In [routes/api/users/me/redemptions.ts](file:///Users/dev/nodo/passport/deno/routes/api/users/me/redemptions.ts#L17-L23), the database query retrieves all redemptions for a user, and then filters them in Javascript:
```ts
    const rows = await db.select()
      .from(schema.redemptions)
      .where(eq(schema.redemptions.userId, userId))
      .orderBy(desc(schema.redemptions.redeemedAt))

    const activeRedemptions = rows
      .filter((r) => r.status === 'active')
```
For users with a long transaction/redemption history, this loads unnecessary data into memory. It is more efficient and conventional to filter by the `active` status directly in the SQL `WHERE` clause.

### Suggested Fix

Update the database query to filter by `active` status directly:

```ts
    const activeRedemptions = await db.select()
      .from(schema.redemptions)
      .where(
        and(
          eq(schema.redemptions.userId, userId),
          eq(schema.redemptions.status, 'active')
        )
      )
      .orderBy(desc(schema.redemptions.redeemedAt))
```

## Triage

- Decision: `valid`
- Notes: The review correctly identifies that filtering by `status = 'active'` in the SQL WHERE clause is more efficient than loading all rows into memory and filtering in JS. Implemented by adding `and()` to the drizzle-orm import and moving the status filter into the WHERE clause. The `.filter()` call was removed and `.map()` was chained via `.then()`. No behavioral change — the same rows with status `'active'` are returned.
```
