# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Fix CSS/interaction issues in `islands/BusinessOnboarding.tsx`:
1. Center-positioned steps (first and last) must render the tooltip with `position:fixed` and `z-index:1001` — previously `tooltipStyle` was set to `{}` for those steps, so the tooltip had no fixed positioning.
2. Remove `onClick={handleDismiss}` from the backdrop div so background clicks do not close the wizard.

## Important Decisions

- For center steps, used `transform: translate(-50%, -50%)` with `top/left: 50%` for true viewport centering — cleaner than computing pixel offsets.
- Did not change the z-index values (backdrop=999, spotlight=1000, tooltip=1001) — the layering was correct, only the missing `position:fixed` was the bug for center steps.

## Learnings

- `BusinessOnboarding - API Integration` test has always failed outside Docker (requires live `postgres` host). Unrelated to this task.
- `tests/feed_page.test.ts` pre-existing TS error still blocks `deno task test` (type-check phase). Run with `--no-check` to execute specific test files.

## Files / Surfaces

- `islands/BusinessOnboarding.tsx` — two edits: `useEffect` center-step branch, backdrop JSX.
- `tests/business_onboarding.test.ts` — updated "renders backdrop" step, added backdrop onClick assertion step, added 3 new Task 08 top-level tests.

## Errors / Corrections

None.

## Status

COMPLETE. 7 unit/component tests pass. Task file and `_tasks.md` updated to `completed`.
