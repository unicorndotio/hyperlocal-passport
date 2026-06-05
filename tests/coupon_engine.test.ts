import { assertEquals, assertMatch, assertNotMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateRedemptionCode } from "../lib/coupon.ts";
import { Coupon, Redemption } from "../lib/coupon.ts";

Deno.test("Coupon Engine - Code Generator", () => {
  const code = generateRedemptionCode(6);
  assertEquals(code.length, 6);
  // Should only contain allowed chars (no 0, 1, O, I, L)
  assertMatch(code, /^[2-9ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  assertNotMatch(code, /[01OIL]/);
});

Deno.test("Coupon Engine - Atomic Redemption Logic", async (t) => {
  const testKv = await Deno.openKv(":memory:");
  
  try {
    const couponId = "test_coupon_1";
    const userId = "test_user_1";
    
    const coupon: Coupon = {
      id: couponId,
      businessId: "biz_1",
      type: "special",
      title: "Limited Coupon",
      globalLimit: 2,
      globalClaimedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await testKv.set(["coupons", couponId], coupon);

    await t.step("successful redemption", async () => {
      const redemptionId = generateRedemptionCode();
      const now = Date.now();
      
      const res = await testKv.get<Coupon>(["coupons", couponId]);
      const c = res.value!;
      
      const atomic = testKv.atomic()
        .check(res)
        .set(["redemptions", redemptionId], { id: redemptionId, couponId, userId, status: "active", redeemedAt: now })
        .set(["user_redemptions", userId, now], { id: redemptionId, couponId, userId, status: "active", redeemedAt: now })
        .set(["coupons", couponId], { ...c, globalClaimedCount: c.globalClaimedCount + 1 });
      
      const commit = await atomic.commit();
      assertEquals(commit.ok, true);
      
      const updatedCoupon = await testKv.get<Coupon>(["coupons", couponId]);
      assertEquals(updatedCoupon.value!.globalClaimedCount, 1);
    });

    await t.step("concurrent redemption - last one wins", async () => {
      // Current count is 1, limit is 2.
      // We'll simulate two concurrent reads.
      const res1 = await testKv.get<Coupon>(["coupons", couponId]);
      const res2 = await testKv.get<Coupon>(["coupons", couponId]);
      
      const c1 = res1.value!;
      const c2 = res2.value!;
      
      // First one commits
      const id1 = "CODE1";
      const now1 = Date.now();
      const atomic1 = testKv.atomic()
        .check(res1)
        .set(["redemptions", id1], { id: id1, couponId, userId, status: "active", redeemedAt: now1 })
        .set(["coupons", couponId], { ...c1, globalClaimedCount: c1.globalClaimedCount + 1 });
      
      const commit1 = await atomic1.commit();
      assertEquals(commit1.ok, true);
      
      // Second one tries to commit with stale versionstamp
      const id2 = "CODE2";
      const now2 = Date.now() + 1;
      const atomic2 = testKv.atomic()
        .check(res2)
        .set(["redemptions", id2], { id: id2, couponId, userId, status: "active", redeemedAt: now2 })
        .set(["coupons", couponId], { ...c2, globalClaimedCount: c2.globalClaimedCount + 1 });
      
      const commit2 = await atomic2.commit();
      assertEquals(commit2.ok, false); // Should fail due to versionstamp mismatch
    });

    await t.step("reject if expired", async () => {
      const expCouponId = "expired_coupon";
      const expiredCoupon: Coupon = {
        id: expCouponId,
        businessId: "biz_1",
        type: "basic",
        title: "Expired",
        globalClaimedCount: 0,
        validUntil: Date.now() - 1000,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await testKv.set(["coupons", expCouponId], expiredCoupon);
      
      const res = await testKv.get<Coupon>(["coupons", expCouponId]);
      const c = res.value!;
      
      // In the actual handler we check this before atomic. 
      // Here we just verify our logic for rejection.
      const isExpired = c.validUntil && c.validUntil < Date.now();
      assertEquals(!!isExpired, true);
    });

    await t.step("reject if userMonthlyLimit reached", async () => {
      const limitCouponId = "limit_coupon";
      const limitCoupon: Coupon = {
        id: limitCouponId,
        businessId: "biz_1",
        type: "basic",
        title: "Limited",
        globalClaimedCount: 0,
        userMonthlyLimit: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await testKv.set(["coupons", limitCouponId], limitCoupon);
      
      const now = Date.now();
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      
      // Simulate existing redemption this month
      await testKv.set(["user_redemptions", userId, now - 1000], { 
        id: "OLD", couponId: limitCouponId, userId, status: "active", redeemedAt: now - 1000 
      });

      // Verification logic as in handler
      const userRedemptions = testKv.list<Redemption>({ 
        prefix: ["user_redemptions", userId] 
      });
      
      let count = 0;
      for await (const entry of userRedemptions) {
        const r = entry.value;
        if (r.couponId === limitCouponId && r.redeemedAt >= startOfMonth) {
          count++;
        }
      }
      
      assertEquals(count >= limitCoupon.userMonthlyLimit!, true);
    });
  } finally {
    testKv.close();
  }
});
