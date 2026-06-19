---
provider: manual
pr:
round: 3
round_created_at: 2026-06-11T01:00:00Z
status: resolved
file: routes/_middleware.ts
line: 43
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Business owners blocked from creating coupons by admin-only middleware

## Review Comment

The admin-only middleware check at line 43–48 in `routes/_middleware.ts` catches all `POST`/`PUT`/`DELETE` requests under `/api/businesses/*` that do not match the profile exemption regex (`/^\/api\/businesses\/[^/]+\/profile$/`). This includes `POST /api/businesses/[id]/coupons`, which is the coupon creation endpoint used by `islands/CouponManager.tsx` (line 43).

Since the middleware grants access only to `admin` role for these paths, any business owner (role=`business`) attempting to create a coupon receives a 403 response. This directly violates PRD requirement F5: "As a business owner, I want to create and manage my own coupons and discounts so that I can run promotions on my schedule."

Note: `PUT`/`DELETE`/`PATCH` on existing coupons work correctly through the `/api/coupons/[id]` path, which is already included in the business-or-admin check at lines 61–77. Only the creation endpoint is affected.

**Fix:** Add a new exemption in the admin-only check for the coupon creation path, similar to the profile exemption:

```ts
(url.pathname.startsWith('/api/businesses') &&
  !url.pathname.match(
    /^\/api\/businesses\/[^/]+\/(profile|coupons)$/
  ) &&
  (req.method === 'POST' || req.method === 'PUT' ||
    req.method === 'DELETE'))
```

Alternatively, move the coupon creation route to `/api/coupons/` (with `POST /api/businesses/:id/coupons` remaining as a redirect or alias), or add an explicit business-or-admin check for the coupon creation path in the middleware.

## Triage

- Decision: `VALID`
- Root cause: The admin-only check at `routes/_middleware.ts:44-47` catches all POST/PUT/DELETE under `/api/businesses/*` that don't match the profile exemption regex (`/^\/api\/businesses\/[^/]+\/profile$/`). `POST /api/businesses/[id]/coupons` doesn't match this exemption, so business owners get 403.
- Fix applied:
  1. Extended the admin-only exemption regex at line 45 from `/^\/api\/businesses\/[^/]+\/profile$/` to `/^\/api\/businesses\/[^/]+\/(profile|coupons)$/` — exempts coupon creation from admin-only check.
  2. Updated the business-or-admin check regex at line 64 from `/^\/api\/businesses\/[^/]+\/profile$/` to `/^\/api\/businesses\/[^/]+\/(profile|coupons)$/` — ensures coupon creation requires business or admin role.
- Tests added: Three new tests in `tests/admin_approvals.test.ts` covering resident (403 Business or Admin required), business (200), and admin (200) for `POST /api/businesses/[id]/coupons`.
