---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/coupon-by-code/[code].ts
line: 20
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Missing authorization check on coupon-by-code API endpoint

## Review Comment

In [routes/api/coupon-by-code/[code].ts](file:///Users/dev/nodo/passport/deno/routes/api/coupon-by-code/[code].ts#L20-L30), the GET endpoint retrieves the redemption and associated coupon details solely using the URL parameter `code`. However, it fails to verify that the redemption code belongs to the business of the authenticated user when the user's role is `business`. This allows a business owner to access other businesses' active redemption and coupon details by guessing or obtaining their code.

### Suggested Fix

Lookup the logged-in user's business profile and assert that the redemption's `businessId` matches:

```ts
    const [business] = await db.select().from(schema.businesses)
      .where(eq(schema.businesses.userId, session.user.id))

    if (!business && session.user.role === 'business') {
      return new Response('Business profile not found', { status: 404 })
    }

    if (session.user.role === 'business' && redemption.businessId !== business.id) {
      return new Response('Forbidden: Code belongs to another business', { status: 403 })
    }
```

## Triage

- Decision: `VALID`
- Root cause: The GET handler at line 20-30 retrieves the redemption by code and then fetches the associated coupon, but never verifies that the redemption's `businessId` matches the authenticated user's business. This allows a business user with role `business` to query any redemption code by guessing or brute-forcing codes.
- Fix approach: Follow the established pattern from `routes/api/transactions/validate.ts` (lines 49-83). Look up the business profile via `businesses.userId = session.user.id`. If the user is `business`, require that `redemption.businessId === business.id`; return 403 if mismatched, 404 if no business found. Skip the check for `admin` users.
- Scope: Changes constrained to the listed file `routes/api/coupon-by-code/[code].ts`. Tests will be added in `tests/`.
