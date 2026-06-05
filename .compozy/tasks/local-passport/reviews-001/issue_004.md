---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: routes/api/coupons/[id]/redeem.ts
line: 41
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Race condition in coupon monthly limit validation

## Review Comment

The `userMonthlyLimit` check in the coupon redemption handler is performed outside the atomic operation.

```typescript
// 4. Check userMonthlyLimit
if (coupon.userMonthlyLimit) {
  const userRedemptions = kv.list<Redemption>({ prefix: ['user_redemptions', userId] })
  // ... count redemptions in-memory
  if (count >= coupon.userMonthlyLimit) return new Response('User monthly limit reached', { status: 400 })
}

// 5. ... attempt atomic update
const result = await atomic.commit()
```

Because `kv.list` results cannot be checked for consistency within an atomic transaction (unlike individual keys), a user could send multiple concurrent redemption requests. All requests might pass the limit check before any of them commit, allowing the user to exceed their monthly limit.

**Suggested Fix:**
While Deno KV doesn't support atomic range checks easily, you can mitigate this by using a specific counter key for `user_coupon_monthly_count:<userId>:<couponId>:<month>` and including that key in the `kv.atomic()` operation with a `.check()` or using `.sum()` if it were a simple counter.

## Triage

- Decision: `VALID`
- Notes: The issue is valid. I will implement a monthly counter key `["user_coupon_monthly_count", userId, couponId, yearMonth]` to enable atomic validation of user limits.

## Resolved
An atomic monthly counter has been implemented using the key `["user_coupon_monthly_count", userId, couponId, yearMonth]`. This key is checked and updated within the `kv.atomic()` transaction in `routes/api/coupons/[id]/redeem.ts`, preventing users from exceeding their monthly limits via concurrent requests. Verification tests in `tests/coupon_redeem_api.test.ts` pass.
