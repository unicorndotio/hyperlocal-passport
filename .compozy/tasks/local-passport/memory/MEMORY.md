# Shared Workflow Memory: local-passport

## Current State

- Task 01 (Extend Business data model) — **complete**
- Task 02 (Self-service business registration endpoint) — **complete**
- Task 03 (Business profile management API) — **complete**
- Task 04 (Admin enable/disable business toggle) — **complete**
- Task 05 (Business dashboard UI — profile editor) — **complete**
- Task 06 (Resident demand signals backend) — **complete**
- Task 07 (Demand signal frontend) — **complete**
- Task 08 (Business self-service registration page) — **complete**

## Shared Decisions

- `OpeningHours` typed as `Partial<Record<string, OpeningHoursEntry>>` — allows partial schedules, day-key access via `DAYS` array.
- `BusinessFormErrors` uses top-level `socialLinks` and `openingHours` string keys (object-level errors, not per-sub-field). Registration endpoint should return error keys matching this shape.
- `cnpj` added to `INDEXED_FIELDS.businesses` in `kv-adapter.ts` — CNPJ uniqueness checks are O(1) via `businesses_by_cnpj` index. Future business operations can rely on this index.
- `State` interface in `utils.ts` extended with `user` and `session` fields — all route handlers can now access the authenticated user via `ctx.state.user`.
- Middleware exempts `/api/businesses/*/profile` from admin-only POST/PUT/DELETE check and routes it through business-or-admin check instead.
- Ownership check pattern: `user.role !== 'admin' && business.userId !== user.id` — reuse this pattern in any endpoint requiring resource ownership.
- Self-service profile editor is a new island (`BusinessProfileEditor.tsx`), separate from the admin `BusinessManager.tsx`. Business owner counterpart to the admin panel.
- Demand signals KV key structure (ADR-003): `["signals", "<id>"]` for records, `["signals_by_category", "<category>", "<timestamp>", "<id>"]` for category index (signalId in 4th part prevents millisecond collisions), `["signal_counts", "<category>"]` for aggregated counts.
- Rate limiting pattern for resident features: KV key `["signal_rate_limit", "<residentId>", "<date>"]` with simple counter, 5/day limit per resident.
- Exported `handle*` functions for testability with dependency-injected `Deno.Kv` instance — route handlers use `kv` singleton from `lib/kv.ts`, test exports accept any `Deno.Kv` for `:memory:` isolation.
- `/business/register` is a public page route exempt from auth middleware — all other `/business/*` routes require auth.
- Logo and category are optional in the business registration endpoint (`POST /api/businesses/register`). Businesses set these later via the profile editor. The API accepts them as optional extra fields for backward compatibility.

## Shared Learnings

- Islands that use `@/` imports resolve correctly in test files when imported via `await import()`.
- `renderToString` from `preact-render-to-string` works for SSR-like rendering tests with mocked business data objects.
- Fresh precompiled islands (`jsx: "precompile"`) cannot render to DOM via `preact.render()` in JSDOM — `root.innerHTML` stays empty. Use `renderToString` for layout checks and `act()` + mocked fetch for side-effect verification.
- Validation logic is best tested as standalone exported functions to avoid JSDOM dependency in data-logic tests.

## Open Risks

- (None)

## Handoffs

- Task 04 (Admin enable/disable business toggle) — **complete**. Created `PUT /api/admin/businesses/[id]/toggle`. Exported `handleToggle` for testability. Uses `kv.atomic()` with optimistic concurrency check. Admin-only via existing `/api/admin/*` middleware.
- Task 05 (Business dashboard UI — profile editor) — **complete**. Created `routes/business/profile.tsx` and `islands/BusinessProfileEditor.tsx`. Full profile editor with logo upload/preview, description, socialLinks (Instagram, Facebook, WhatsApp, menu URL), openingHours (day-by-day time pickers), and activation status banner. Server-side data fetch pattern matching existing business pages. Tests: 7 test groups (9 steps) covering validation logic, rendering, and mocked API submission.
- Task 08 (Business self-service registration page) — **complete**. Created `routes/business/register.tsx` and `islands/BusinessRegistrationForm.tsx`. Form accepts name, companyName, CNPJ, email, password with client-side validation. Submits via multipart/form-data. Success state redirects to `/login?registered=business`. LoginForm shows banner when query param present. API endpoint updated to make logo/category/description/socialLinks/openingHours optional. Middleware updated to exempt `/business/register` from auth. Tests: 5 test groups (7 steps) covering CNPJ helpers, email/password validation, and rendering. 115 total tests pass (298 steps), 0 failures.
- Task 06 (Resident demand signals backend) — **complete**. Created backend for PRD F7: `POST /api/signals` (resident signal creation with 5/day rate limit, category indexing, atomic count updates), `GET /api/admin/signals` (admin listing with category counts and reviewed/unreviewed tracking), `PUT /api/admin/signals/[id]/review` (admin reviews signal). All handlers exported for testability. Tests: 5 groups (20 steps) covering creation, validation, rate limiting, listing with counts, review, and lib validation. Task 07 next.
