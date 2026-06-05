# Task 09: Build Coupon Engine API & Redemption Logic - Memory

## Objective Snapshot
- [x] Implement Coupon CRUD API.
- [x] Implement atomic redemption logic with `globalLimit` and `userMonthlyLimit`.
- [x] Generate short alphanumeric redemption codes.
- [x] Save generated codes in KV for fast lookup.

## Important Decisions
- Hybrid persistence: Used `kv-adapter.ts` for simple CRUD but direct `Deno.Kv` atomic operations for the redemption logic to ensure strict consistency and rollback on failure.
- Key Structure: Followed TechSpec key patterns for `redemptions` and `user_redemptions` to enable efficient per-user monthly counting.

## Learnings
- Fresh 2 testing: `define.handlers` can be tested by invoking the handler methods directly with a mock context object.
- Deno Testing & Seatbelt: Set `DENO_DIR` to a local path (e.g., `.deno_cache`) to avoid "Operation not permitted" errors in macOS Seatbelt environments.

## Files / Surfaces
- `lib/coupon.ts` (Types & Code Gen)
- `routes/api/businesses/[id]/coupons.ts` (Business Coupon CRUD)
- `routes/api/coupons/[id].ts` (Individual Coupon CRUD)
- `routes/api/coupons/[id]/redeem.ts` (Atomic Redemption)
- `tests/coupon_engine.test.ts`
- `tests/coupon_api.test.ts`
- `tests/coupon_redeem_api.test.ts`

## Errors / Corrections
- Fixed alphanumeric code generator: Removed 'L' from the allowed character set as it could be confused with '1' or 'I', despite '1' and 'I' already being excluded.

## Ready for Next Run
- Coupon Engine API is fully functional and tested.
- Redemption flow generates codes and updates limits atomically.
- Ready for Task 10 (Coupon Management UI).
