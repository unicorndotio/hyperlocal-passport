# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add "Solicitar serviço" button + signal request modal to catalog page and signal viewer tab with category aggregation to ApprovalDashboard island.

## Important Decisions

- Used simple overlay modal (fixed div + backdrop) instead of Radix UI AlertDialog to keep island light and match existing ApprovalDashboard document modal pattern.
- preact `render()` in JSDOM leaves `root.innerHTML` empty for `.tsx` islands compiled with Fresh `jsx: "precompile"`. Use `renderToString` for SSR layout checks and `act()` + mocked fetch for side-effect verification.
- Tests use `renderToString` — this is the only viable approach for precompiled Fresh islands.

## Learnings

- Fresh islands compiled with `jsx: "precompile"` cannot be rendered to DOM via `preact.render()` in JSDOM. The hooks fire but the innerHTML stays empty.
- `renderToString` from `preact-render-to-string` works for SSR-like rendering and can verify button presence, class names, text content, etc.
- `act()` + mocked fetch can test side effects of precompiled islands (e.g., data submission, state changes).
- When mocking `Deno.env.get` in tests, ensure the env var is set before any module imports that read it at module scope.
- Adding `state` to handler `FreshContext` type parameters breaks existing call sites that don't pass state — need to fix all sites in the same change.

## Files / Surfaces

- `islands/SignalRequestIsland.tsx` — new: button + modal form + submit/error/success states
- `routes/catalog.tsx` — added user to handler data, conditional render for resident role
- `islands/ApprovalDashboard.tsx` — rewritten: added tab system, signals tab with CategoryCount grouping, review action, unreviewed badge
- `tests/signals_ui.test.ts` — new: SSR layout tests for both components + fetch-verification tests
- `tests/catalog_page.test.ts` — extended: tests for resident/non-resident button visibility
- `tests/mobile_catalog_integration.test.ts` — fixed: added `state` to handler context type

## Errors / Corrections

- First ApprovalDashboard signals tab used 2-column grid — corrected to single-column card layout matching document list pattern.
- Signal request modal description textarea had no character limit — added 10–500 char constraint with live counter.
- First test iteration used `render()` + JSDOM which produced empty output — rewrote to use `renderToString`.

## Ready for Next Run

All 110 tests pass. Debug file `tests/debug_signal.ts` has been removed. No known issues.
