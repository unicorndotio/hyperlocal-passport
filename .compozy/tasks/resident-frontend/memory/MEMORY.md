# Workflow Memory

## Current State

- Task 03 (feed page) completed — routes/index.tsx rewritten as feed page
- Task 04 (shared BottomNav) completed — 3 routes updated, unit tests added
- components/BottomNav.tsx created (task 03), used by tasks 04, 07
- components/FeedEventCard.tsx created with type-specific card rendering

## Shared Decisions

- Middleware `/api/feed` bypass pattern: unauthenticated access is allowed by checking `url.pathname === '/api/feed'` inside the API auth block before the 401 return.
- FeedEventCard extracted to standalone component to avoid DB dependency in unit tests — any module importing lib/db.ts top-level will fail without PG_CONNECTION

## Shared Learnings

- feed_events MV JOIN requires `::text` cast: `merchant_posts.business_id` is `uuid` type while `businesses.id` is `text`. Without this cast the MV creation fails.

## Open Risks

## Handoffs
