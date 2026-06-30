---
provider: manual
pr:
round: 2
round_created_at: 2026-06-30T17:22:16Z
status: resolved
file: lib/feed.ts
line: 9
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: admin_announcement FeedEventType and rendering card are dead code — MV has no source table

## Review Comment

`FeedEventType` includes `'admin_announcement'` and `FeedEventCard` renders a
dedicated card for it, but the `feed_events` materialized view has no source for
admin announcement events:

```ts
// lib/feed.ts
export type FeedEventType =
  | 'merchant_post'
  | 'coupon_released'
  | 'savings_notice'
  | 'admin_announcement'    // ← defined in the type
```

```tsx
// components/FeedEventCard.tsx
case 'admin_announcement':
  return <AdminAnnouncementCard event={event} />   // ← rendering card exists
```

```sql
-- db/migrations/0000_high_franklin_storm.sql
CREATE MATERIALIZED VIEW feed_events AS
  SELECT ... FROM merchant_posts ...        -- merchant_post
  UNION ALL
  SELECT ... FROM coupons ...               -- coupon_released
  -- no admin_announcement source
  ORDER BY created_at DESC;
```

The `feed_events` MV cannot produce a row with `type = 'admin_announcement'`.
`AdminAnnouncementCard` will never render in practice.

The PRD (F1) and TechSpec both mention "admin announcements" as a feed source:
> "System-generated events: coupon release announcements, transaction savings
> notices, admin announcements"

However, the TechSpec's implementation design only lists `merchant_posts` and
`coupons` as MV sources, and the ADR-005 notes "(future table or mechanism)" for
admin announcements. The table `admin_announcements` was never created.

This creates dead code that can confuse future developers — the type and card
suggest admin announcements are implemented, but they never appear.

**Fix:** One of two approaches:
1. **Remove the dead code** — remove `'admin_announcement'` from `FeedEventType`
   and remove `AdminAnnouncementCard` and its `case` until an admin announcements
   table is created. This is the cleaner approach for V1.
2. **Document as pending** — add a comment to the MV migration and the type
   definition noting this is intentionally stubbed, awaiting the `admin_announcements`
   table. Add a `// TODO(phase-2)` comment in `FeedEventCard.tsx`.

Option 2 is acceptable if admin announcements are firmly on the Phase 2 roadmap and
the team wants to preserve the implementation skeleton. Either way, the current code
silently delivers on a type that can never be exercised.

## Triage

- Decision: `VALID` — `admin_announcement` was dead code: defined in `FeedEventType`, had a rendering card and test, but the `feed_events` MV has no source table (`admin_announcements` doesn't exist in schema). Removed the type union variant, the rendering case + `AdminAnnouncementCard` function, and the test case. All 7 unit test steps pass, format/lint/type-check clean.

