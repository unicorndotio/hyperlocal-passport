---
provider: manual
pr:
round: 2
round_created_at: 2026-06-26T14:55:00Z
status: resolved
file: tests/routes/api/admin/businesses/toggle_test.ts
line: 46
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Type mismatch on businesses table insert in toggle tests

## Review Comment

In [tests/routes/api/admin/businesses/toggle_test.ts](file:///Users/dev/nodo/passport/deno/tests/routes/api/admin/businesses/toggle_test.ts#L46), `db.insert(schema.businesses).values()` is called with `biz as Record<string, unknown>`. Because of Drizzle's strict type safety on `.values()`, casting the payload to `Record<string, unknown>` removes the required typed keys, resulting in a `TS2769` compiler failure during `deno task check`.

### Suggested Fix

Cast the business object as `any` or construct it with a type that matches the expected schema insert type:

```ts
  await db.insert(schema.businesses).values(biz as any)
```

## Triage

- Decision: `VALID`
- Root cause: `db.insert(schema.businesses).values()` requires a typed insert object matching the Drizzle schema, but `Record<string, unknown>` removes all key type information, causing a `TS2769` compilation failure.
- Fix: Cast the business object as `any` in `.values()` call to bypass Drizzle's strict type checking without changing the function signatures used across multiple test steps.
- Verified: `deno task check` passes with the fix applied.
