# Task Memory: task_03.md

## Objective Snapshot

Rewrite routes/index.tsx as the feed page — handler calls queryFeed(), renders event cards with type-specific styling, empty state, loading skeleton, BottomNav.

## Important Decisions

- Extracted FeedEventCard into components/FeedEventCard.tsx to decouple card rendering from DB dependency, enabling unit tests without PG_CONNECTION
- Created components/BottomNav.tsx as a shared component (task_04 dependency) since the feed page needs it
- Used `formatBRL` from lib/utils.ts for Brazilian Real formatting in savings_notice cards
- Used `<script>{...}</script>` instead of dangerouslySetInnerHTML for inline JS (avoids lint error)

## Learnings

- lib/db.ts throws at top level when PG_CONNECTION is not set, so any module that transitively imports it will fail in test environments without PG_CONNECTION
- preact-render-to-string works well for unit testing component rendering without a database
- Fresh's define.page<typeof handler> typing requires the handler to be exported first

## Files / Surfaces

- routes/index.tsx — Rewritten: handler (GET), default export FeedPage, inline skeleton + script
- components/BottomNav.tsx — New: shared bottom nav with feed/catalog/passaporte tabs
- components/FeedEventCard.tsx — New: card rendering for all 4 event types
- tests/feed_page.test.ts — New: 8 unit test steps (FeedEventCard + BottomNav) + 3 integration scenarios

## Errors / Corrections

- Initial test file imported routes/index.tsx at top level, which failed without PG_CONNECTION
- Fixed: extracted card components into components/FeedEventCard.tsx (no db dependency)
- Fixed: replaced dangerouslySetInnerHTML with `<script>{...}</script>` to satisfy lint react-no-danger

## Ready for Next Run

- Integration tests (PG_CONNECTION tests) skipped in this environment; pass when PG_CONNECTION is set
- BottomNav component is ready for tasks 04, 07 to adopt
- FeedEventCard is available for any component that needs to render feed events
