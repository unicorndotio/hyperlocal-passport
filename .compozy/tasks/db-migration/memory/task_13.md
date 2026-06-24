# Task Memory: task_13.md

## Objective Snapshot

Rewrite `seed.ts` to use Drizzle inserts instead of KV writes. Create admin user via Better Auth, set role/status via Drizzle update. Create sample businesses/coupons. Idempotent. No `--unstable-kv`.

## Important Decisions

- Used `db.insert().onConflictDoNothing()` for idempotent business/coupon/analytics inserts (handles both PK and unique constraint conflicts)
- Used fixed business IDs (`seed-biz-central-cafe`, `seed-biz-central-livros`) instead of random UUIDs so idempotency check works across runs
- `signUpOrGetUser` checks for credential account existence after finding existing user by email; if missing, deletes user's businesses then the user (FK-safe) and re-signs up
- Imported `betterAuth` directly (same pattern as `tests/auth.test.ts`) instead of reusing `lib/auth.ts` — avoids coupling seed to auth module config

## Learnings

- Better Auth sign-in returns `role` and `status` fields only when `additionalFields` is configured in the auth instance
- Pre-existing user `admin_user` had no `account` record (created before Drizzle migration), causing sign-in to fail with "Credential account not found"
- `cascade` FK on `couponAnalytics.couponId` auto-cleans analytics when coupon is deleted, but `businesses.userId` FK has no cascade — must delete businesses explicitly before deleting user

## Files / Surfaces

- `seed.ts` — rewritten entirely (203 lines)
- `deno.json` — removed `--unstable-kv` from seed task

## Errors / Corrections

- First attempt: `crypto.randomUUID()` for business IDs broke idempotency (different ID each run, CNPJ unique constraint violated). Fixed by using fixed string IDs.
- Second attempt: Sign-in failed because `admin_user` had no `account` record. Fixed by adding credential account check in `signUpOrGetUser`.
- FK constraint: `DELETE FROM users` failed because businesses referenced the user. Fixed by deleting businesses first.

## Ready for Next Run

All checks pass. Seed idempotent. Admin can sign in with correct role/status.
