# Task Memory: task_04.md

## Objective Snapshot

Extracted duplicate bottom nav from catalog, passaporte, and business/[id] pages into shared components/BottomNav.tsx.

## Important Decisions

- BottomNav component already existed from task 03 — subtask 04.1 was already satisfied
- Moved BottomNav tests out of feed_page.test.ts into dedicated tests/bottom_nav.test.ts to avoid unused imports and separate concerns
- Page-level integration tests guarded by PG_CONNECTION check — gracefully skipped when not set

## Files / Surfaces

- `components/BottomNav.tsx` — Shared component (created in task 03)
- `routes/catalog.tsx` — Replaced inline nav
- `routes/passaporte.tsx` — Replaced inline nav
- `routes/business/[id].tsx` — Replaced inline nav
- `tests/bottom_nav.test.ts` — Unit tests with text-primary/text-muted-foreground assertions
- `tests/feed_page.test.ts` — Removed duplicate BottomNav tests

## Verification

- `deno task test -- --filter "bottom_nav"`: 4/4 unit tests pass, integration tests skipped (PG_CONNECTION)
- `deno task type-check`: clean
- `deno task lint`: 28 pre-existing errors (none in task_04 files)
