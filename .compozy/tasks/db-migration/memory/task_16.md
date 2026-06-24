# Task Memory: task_16.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Migrate 5 business page routes from KV/adapter to Drizzle: `[id].tsx`, `profile.tsx`, `analytics.tsx`, `coupons.tsx`, `checkout.tsx`. All five now use `db.select().from(schema.businesses).where(eq(...))` with zero KV imports. `lib/analytics.ts` `incrementViewCount()` already on Drizzle (verified).

## Important Decisions

- Used `as unknown as Business[]` / `as unknown as Coupon[]` casts on query results. Drizzle returns `string | null` for nullable text columns and `Date` for timestamps, but the existing `Business`/`Coupon` interfaces use `?` (undefined) for optional fields and `string` for `createdAt`. Casts avoid cascading type changes to island/component props.

## Learnings

- Drizzle returns `string | null` for nullable `text()` columns (no `.notNull()`), while existing KV-era interfaces used `string | undefined`. Same applies for `boolean | null` vs `boolean | undefined`.
- Drizzle returns `Date` for `timestamp()` columns, but interfaces use `string` for `createdAt`.
- Type assertions (`as unknown as T[]`) are needed at the query boundary to bridge this gap.

## Files / Surfaces

- `routes/business/[id].tsx` — KV `get` → Drizzle select by id; adapter `findMany` → Drizzle select with `and(eq(businessId), eq(isActive))`
- `routes/business/profile.tsx` — adapter `findOne` → Drizzle select by userId; removed module-level `adapter` variable
- `routes/business/analytics.tsx` — same pattern as profile
- `routes/business/coupons.tsx` — `findOne` → Drizzle for business; `findMany` → Drizzle for coupons
- `routes/business/checkout.tsx` — same pattern as profile

## Errors / Corrections

- Initial type-check failures due to `string | null` vs `string | undefined` mismatch on `description` and `hasSeenMerchantOnboarding` fields. Fixed with `as unknown as Business[]` / `as unknown as Coupon[]` casts.

## Ready for Next Run

All five files pass `deno check` with zero errors. Zero KV/adapter imports remain. Task complete — no follow-up blockers for task_17 (test migration).
