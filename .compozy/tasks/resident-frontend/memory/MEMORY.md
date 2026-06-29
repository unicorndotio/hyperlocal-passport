# Workflow Memory

## Current State

- Task 03 (feed page) completed — routes/index.tsx rewritten as feed page
- components/BottomNav.tsx created (part of task 03, needed by tasks 04, 07)
- components/FeedEventCard.tsx created with type-specific card rendering

## Shared Decisions

- Middleware `/api/feed` bypass pattern: unauthenticated access is allowed by checking `url.pathname === '/api/feed'` inside the API auth block before the 401 return.
- FeedEventCard extracted to standalone component to avoid DB dependency in unit tests — any module importing lib/db.ts top-level will fail without PG_CONNECTION

## Shared Learnings

## Open Risks

## Handoffs
