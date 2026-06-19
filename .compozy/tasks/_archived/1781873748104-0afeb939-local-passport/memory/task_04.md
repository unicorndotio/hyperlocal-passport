# Task 04: Admin enable/disable business toggle — Memory

## Objective Snapshot

- [x] 4.1 Create `routes/api/admin/businesses/[id]/toggle.ts` route handler
- [x] 4.2 Implement the toggle logic (read business, flip isActive, save)
- [x] 4.3 Write unit and integration tests — 10 test steps, all passing

## Important Decisions

- Exported `handleToggle(businessId, isActive?)` for testability, following the same pattern as `handleProfileUpdate` from Task 03.
- If `isActive` is omitted from the request body, the handler defaults to `!currentValue` (flips current state) per requirement.
- Used `kv.atomic()` with check for the update — same pattern as the approvals endpoint — to prevent concurrent overwrite races.
- The admin middleware already enforces RBAC for `/api/admin/*` paths, so no additional auth logic is needed in the route handler itself.
- Updated `islands/BusinessManager.tsx` `handleToggleActive` to call `PUT /api/admin/businesses/${b.id}/toggle` instead of the generic `PUT /api/businesses/${b.id}`.

## Learnings

- The existing toggle in `routes/api/businesses/[id].ts` was used generically for all PUT updates (multipart and JSON). The new dedicated endpoint is simpler: JSON-only, single-purpose toggle.
- Middleware auth tests can be imported from `_middleware.ts` and tested by mocking `auth.api.getSession` — the existing pattern in `admin_approvals.test.ts` works well for any `/api/admin/*` route.

## Files / Surfaces

- `routes/api/admin/businesses/[id]/toggle.ts` — New admin toggle handler
- `islands/BusinessManager.tsx` — Updated `handleToggleActive` to use new endpoint
- `tests/routes/api/admin/businesses/toggle_test.ts` — Unit and integration tests (10 steps)

## Errors / Corrections

- Lint: `assertExists` unused import in test file (removed).

## Ready for Next Run

- Task 04 complete. Admin can toggle business active/inactive via `PUT /api/admin/businesses/[id]/toggle`. BusinessManager island calls the new endpoint. Next: Task 05 (Business dashboard UI — profile editor).
