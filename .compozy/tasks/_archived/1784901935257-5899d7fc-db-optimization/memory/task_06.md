# Task Memory: task_06.md

## Objective Snapshot

Add `feedEvents` pgTable to `db/schema.ts` and convert `lib/feed.ts` `queryFeed()` from raw SQL to typed Drizzle. Remove `::timestamptz` casts and manual row mapping. Only `refreshFeedView` retains raw SQL.

## Important Decisions

- Used conditional `query.where()` chaining for cursor-based pagination in `queryFeed()`
- Used `and(eq(...), gte(...), ...(cursorDate ? [lt(...)] : []))` pattern for transaction query cursor — avoids passing `undefined` to `and()`
- Direct named imports `{ feedEvents, transactions, businesses }` alongside `* as schema` for convenience

## Learnings

- The `mvQuery.where()` can be called conditionally before chaining `.orderBy()` / `.limit()` because Drizzle's query builder mutates in-place
- `deno fmt` adds multi-line formatting for long chains; auto-fixes on save

## Files / Surfaces

- `db/schema.ts` — added `feedEvents` pgTable (6 lines before Relations)
- `lib/feed.ts` — updated imports, replaced MV query, replaced transaction query

## Errors / Corrections

None.

## Ready for Next Run

Yes.
