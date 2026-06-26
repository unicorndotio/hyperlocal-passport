---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/transactions/validate.ts
line: 58
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Checkout validation blocks administrators without a business profile

## Review Comment

In [routes/api/transactions/validate.ts](file:///Users/dev/nodo/passport/deno/routes/api/transactions/validate.ts#L58-L63), the transaction validation logic allows either a `business` or `admin` role to validate checkouts (line 29). However, on lines 49-50, it queries the `businesses` table to get the business profile associated with the current user ID. If the user is an administrator (`session.user.role === 'admin'`), they will typically not have a business profile, causing the check `if (!business)` on line 58 to fail with a `403 Forbidden` response.

### Suggested Fix

Skip the user-business association check when the user is an admin. Instead, extract the target business ID from the redemption record itself:

```ts
    let businessId: string
    if (session.user.role === 'admin') {
      // Find redemption first or fetch it out of the transaction block
      // To get the redemption's businessId
    } else {
      const [business] = await db.select().from(schema.businesses)
        .where(eq(schema.businesses.userId, session.user.id))
      if (!business) {
        return new Response('Business profile not found for this user', { status: 404 })
      }
      businessId = business.id
    }
```

Then check that the redemption matches the cashier's business only if the user is a merchant, not an admin.

## Triage

- Decision: `VALID`
- The issue is confirmed: lines 49-63 unconditionally require a business profile linked to the session user, but the endpoint allows `admin` role (line 29). Admin users typically have no `businesses` row, so they always hit the 403 path. The fix must skip the business-profile lookup for admins and instead derive `businessId` from the redemption record inside the transaction.
