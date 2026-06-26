# Task Memory: task_04.md

## Objective Snapshot
Rewrite validate endpoint with multi-behavior dispatch, quantity support, minimum purchase enforcement, and analytics counter increment.

## Important Decisions
- Removed strict amountCents validation from top of handler; now validates after coupon fetch based on behavior type
- For BOGO/item_specific: quantity is required, amountCents is optional (validated for consistency if provided)
- For percent/fixed: amountCents is required (unchanged behavior)
- Analytics validation counter read + atomic increment follows same pattern as redeem.ts

## Learnings
- `Deno.openKv` is unstable and requires `--unstable-kv` flag
- Moving amountCents validation downstream broke the "Missing body fields" test (code without amountCents now gets 404 at redemption lookup instead of 400 at validation)

## Files / Surfaces
- Modified: `routes/api/transactions/validate.ts` — full rewrite of validation flow
- Modified: `tests/checkout_api.test.ts` — added 13 new test steps in a separate test block, fixed 1 existing test
- New import: `lib/analytics.ts` (validationCountKey)
- Depends on: `lib/coupon-engine.ts` (calculate, checkMinimumPurchase), `lib/coupon.ts` (types)

## Errors / Corrections
- None

## Ready for Next Run
- Task complete. All 125 tests passing (349 steps, 0 failed).
