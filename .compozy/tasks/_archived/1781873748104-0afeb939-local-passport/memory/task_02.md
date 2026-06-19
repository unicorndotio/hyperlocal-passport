# Task 02: Self-service business registration endpoint — Memory

## Objective Snapshot

- [x] 2.1 Create `routes/api/businesses/register.ts` with multipart form handling
- [x] 2.2 Implement user creation via Better Auth with `role=business`
- [x] 2.3 Implement business record creation with `isActive=false`
- [x] 2.4 Add duplicate email/CNPJ detection
- [x] 2.5 Write unit and integration tests — 14 test steps, all passing

## Important Decisions

- Used `auth.api.signUpEmail` (not `auth.api.createUser`) for user creation — matches the existing pattern in admin approval flow.
- Added `'cnpj'` to `INDEXED_FIELDS.businesses` in `lib/kv-adapter.ts` so CNPJ uniqueness checks use a direct `kv.get` lookup instead of O(N) scan.
- Validates logo presence/size early (before upload) to return clear client error instead of letting `uploadFile` throw.
- Business creation uses `kv.atomic().set()` for business record + CNPJ index. If atomic fails, cleans up user record and uploaded logo.
- Returns `{ user, business }` in 201 response — user with `role=business` and `status=pending`, business with `isActive=false`.
- Endpoint is public (exempt from auth middleware) per spec.

## Learnings

- `auth.api.signUpEmail` with `asResponse: false` returns `{ user, session }` — the session is created but ignored (user logs in separately).
- `auth.api.signUpEmail` throws when email already exists — caught and returned as 409.
- CNPJ parsing from JSON fields (`socialLinks`, `openingHours`) needs manual `JSON.parse` since FormData values are strings.

## Files / Surfaces

- `lib/kv-adapter.ts` — Added `cnpj` to `INDEXED_FIELDS.businesses`
- `routes/api/businesses/register.ts` — New self-service registration handler
- `routes/_middleware.ts` — Added `/api/businesses/register` to public exempt paths
- `tests/routes/api/businesses/register_test.ts` — Unit and integration tests (14 steps)

## Errors / Corrections

- (None)

## Ready for Next Run

- Task 02 complete. Businesses can self-register via `POST /api/businesses/register`. User created with `role=business, status=pending`. Business record created with `isActive=false`. Next: Task 03 (Business profile management API).
