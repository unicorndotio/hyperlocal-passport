---
provider: manual
pr:
round: 1
round_created_at: 2026-06-30T16:58:49Z
status: resolved
file: routes/passaporte.tsx
line: 55
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: passaporte.tsx duplicates savings aggregation logic from /api/users/me/savings

## Review Comment

`routes/passaporte.tsx` re-implements the savings aggregation inline instead of
calling the dedicated `GET /api/users/me/savings` endpoint or its underlying query
logic:

```ts
// routes/passaporte.tsx ~line 55
const savingsRows = await db.select({
  businessId: transactions.businessId,
  businessName: businesses.name,
  savingsCents: transactions.discountAppliedCents,
})
  .from(transactions)
  .innerJoin(businesses, eq(transactions.businessId, businesses.id))
  .where(eq(transactions.userId, userId))

const totalSavingsCents = savingsRows.reduce((sum, r) => sum + r.savingsCents, 0)
const byBusinessMap = new Map<string, SavingsByBusiness>()
// … same aggregation loop as in routes/api/users/me/savings.ts
```

Meanwhile, `routes/api/users/me/savings.ts` contains the canonical implementation
of the same query, including the join with `redemptions` (filtered to
`status = 'used'`).  The page handler's version **skips the `redemptions` join and
the `status = 'used'` filter** — it sums *all* transactions for the user, including
any that might be linked to still-active redemptions.  Whether this is currently a
practical difference depends on the transaction lifecycle, but it is a semantic
divergence that will drift further as requirements evolve.

Two diverging implementations of the same query creates a maintenance hazard: any
future change to the savings logic (e.g., excluding refunded transactions, adding a
date filter) must be applied in two places.

**Fix:** Extract the savings query into a shared function in `lib/coupon.ts` or a
new `lib/savings.ts`, and call it from both `routes/passaporte.tsx` and
`routes/api/users/me/savings.ts`.  This guarantees both surfaces always show
consistent data.

```ts
// lib/savings.ts (new)
export async function getSavingsSummary(userId: string): Promise<SavingsSummary> {
  // canonical implementation here
}
```

Then in `routes/passaporte.tsx`:
```ts
import { getSavingsSummary } from '../lib/savings.ts'
// …
const savingsHistory = await getSavingsSummary(userId)
```

## Triage

- Decision: `VALID`
- Notes: Issue confirmed — `routes/passaporte.tsx` duplicated the savings aggregation inline, diverging from the canonical implementation in `routes/api/users/me/savings.ts`. The page version queried `transactions` directly (no `redemptions` join, no `status = 'used'` filter), while the API endpoint correctly joined through `redemptions` with `status = 'used'`. Fixed by:
  1. Creating `lib/savings.ts` with a shared `getSavingsSummary()` function using the canonical query (redemptions → transactions join, status = 'used' filter)
  2. Updating `routes/passaporte.tsx` to call `getSavingsSummary(userId)` instead of inline query
  3. Updating `routes/api/users/me/savings.ts` to call `getSavingsSummary(userId)` instead of inline query
  Both surfaces now use the same logic, eliminating the maintenance hazard and semantic divergence. Type-check passes clean.
