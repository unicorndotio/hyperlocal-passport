---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/coupons/[id]/redeem.ts
line: 44
severity: medium
author: claude-code
provider_ref:
---

# Issue 007: Timezone discrepancy in start of month calculation for usage limits

## Review Comment

In [routes/api/coupons/[id]/redeem.ts](file:///Users/dev/nodo/passport/deno/routes/api/coupons/[id]/redeem.ts#L44-L53), the local server time is used to calculate the start of the current month:
```ts
const now = new Date()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
```
If the server runtime timezone is different from the target timezone where residents redeem coupons (e.g. server UTC vs. resident Brasilia UTC-3 time), this query can compare date boundaries incorrectly. A resident redeeming at 10 PM on May 31st local time might be evaluated using June 1st server time, leading to premature usage count resets or blocking.

### Suggested Fix

Calculate the boundary time either in UTC, or adjust it explicitly to the target local timezone (e.g. America/Sao_Paulo):

```ts
    // Standardize month start using UTC calculations
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
```

## Triage

- Decision: `valid`
- Root cause: `new Date()` followed by `new Date(year, month, day)` uses the server's local timezone. All timestamps in the database are stored as `timestamp without time zone` via `defaultNow()` (PostgreSQL `now()`, typically UTC) and Drizzle serializes Date objects via `.toISOString()` (UTC). The mismatch between local-timezone `startOfMonth` and UTC-based stored `redeemedAt` can cause incorrect month boundary comparison when the server timezone differs from UTC (e.g. server in UTC, user in UTC-3).
- Fix: Replace local-timezone `getFullYear()/getMonth()` with UTC-based `getUTCFullYear()/getUTCMonth()` and construct the boundary timestamp using `Date.UTC()` so the comparison is consistently UTC-based.
- Test: Added `redeem_monthly_limit_utc_consistent` test that seeds a redemption with an explicit UTC `redeemedAt` near the month boundary and verifies the monthly cap logic uses UTC-consistent calculations.
