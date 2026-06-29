# Task Memory: task_07.md

## Objective Snapshot

Create PassportCover island with closed/open/locked states and CSS transitions. Update passaporte page to use PassportCover + BottomNav. Add savings history display.

## Important Decisions

- `data-open` attribute on cover div toggles between closed/open states via CSS transitions
- Locked state is a completely different render path (not just cover + data-locked)
- Cover uses absolute positioning (inset-0) to overlay inner content; inner content in flow determines container height
- Handler fetches savings data directly from transactions table (not via API endpoint, since task_08 is pending)

## Learnings

- preact-render-to-string renders useSignal at initial value (false), so open state can only be tested via attribute structure, not interaction
- PassportCover imports QRCodeDisplay island which renders a loading placeholder in SSR (canvas isn't available) - acceptable for static tests

## Files / Surfaces

- `islands/PassportCover.tsx` — Created: main island with 3 visual states, data-open transitions
- `routes/passaporte.tsx` — Modified: handler now fetches user status and savings data; page uses PassportCover
- `tests/passport_cover.test.ts` — Created: 10 test steps covering all states and edge cases
- `tests/passaporte_page.test.ts` — Unchanged: existing tests still compatible (handler returns same shape + extra fields)

## Errors / Corrections

- First test run failed because `assertStringIncludes(html, 'passaporte')` didn't match 'PASSAPORTE' or 'Passaporte Local' — fixed casing
- Lint flagged unused `assertEquals` import — removed

## Ready for Next Run

All verification clean. 10/10 tests pass. Lint + type-check clean.
