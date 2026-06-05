# Task 12: Build Checkout Validation API - Memory

## Objective Snapshot
- [ ] Implement `POST /api/transactions/validate` endpoint.
- [ ] Implement logic to look up `Redemption` by short alphanumeric code.
- [ ] Use `kv.atomic()` to mark `Redemption` as `used` and record a `Transaction`.
- [ ] Validate related coupon expiration and redemption status.
- [ ] Achieve 80%+ test coverage.

## Important Decisions
- (None yet)

## Learnings
- (None yet)

## Files / Surfaces
- `routes/api/transactions/validate.ts`
- `lib/coupon.ts` (Redemption and Transaction interfaces)
- `tests/checkout_api.test.ts`

## Errors / Corrections
- (None yet)

## Ready for Next Run
- Task 12 initialization complete.
