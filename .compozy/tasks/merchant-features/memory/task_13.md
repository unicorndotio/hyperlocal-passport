# Task Memory: task_13.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add per-day toggle/remove functionality to BusinessProfileEditor's opening hours section. Merchants can remove individual days; removed days' inputs are hidden and an "+ Add [Day]" button appears instead. Submission omits removed days.

## Important Decisions

- Used `Set<string>` for removedDays state (Set provides O(1) add/delete/has).
- Exported `filterOpeningHours` pure function from the component module for testability.
- JSDOM + Preact `render()` does not render `BusinessProfileEditor` (unknown incompatibility with precompile JSX), so interactive toggle tests use the exported pure function instead of DOM interaction.
- Button text in English ("Remove", "+ Add [Day]") per task requirement.

## Learnings

## Files / Surfaces

- `islands/BusinessProfileEditor.tsx` — Added `removedDays` state, `removeDay()`, `addDay()`, `filterOpeningHours()`; modified validation (skips removed days), submission (uses filterOpeningHours), render (conditional day display).
- `tests/business_profile_ui.test.ts` — Added 6 new tests for `filterOpeningHours`; updated SSR test to assert 7 Remove buttons.

## Errors / Corrections

- JSDOM + Preact `render()` with precompile-JSX components renders empty; `renderToString()` works correctly. Interactive toggle tests refactored to test the exported pure function instead.

## Ready for Next Run
