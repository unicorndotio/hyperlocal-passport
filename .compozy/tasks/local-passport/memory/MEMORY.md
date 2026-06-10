# Shared Workflow Memory: local-passport

## Current State

- Task 01 (Extend Business data model) — **complete**
- Task 02 (Self-service business registration endpoint) — **complete**
- Task 03 (Business profile management API) — **complete**
- Task 04 (Admin enable/disable business toggle) — **complete**
- Task 05 (Business dashboard UI — profile editor) — **next**

## Shared Decisions

- `OpeningHours` typed as `Partial<Record<string, OpeningHoursEntry>>` — allows partial schedules, day-key access via `DAYS` array.
- `BusinessFormErrors` uses top-level `socialLinks` and `openingHours` string keys (object-level errors, not per-sub-field). Registration endpoint should return error keys matching this shape.
- `cnpj` added to `INDEXED_FIELDS.businesses` in `kv-adapter.ts` — CNPJ uniqueness checks are O(1) via `businesses_by_cnpj` index. Future business operations can rely on this index.
- `State` interface in `utils.ts` extended with `user` and `session` fields — all route handlers can now access the authenticated user via `ctx.state.user`.
- Middleware exempts `/api/businesses/*/profile` from admin-only POST/PUT/DELETE check and routes it through business-or-admin check instead.
- Ownership check pattern: `user.role !== 'admin' && business.userId !== user.id` — reuse this pattern in any endpoint requiring resource ownership.

## Shared Learnings

- (No cross-task learnings yet.)

## Open Risks

- (None)

## Handoffs

- Task 04 (Admin enable/disable business toggle) — **complete**. Created `PUT /api/admin/businesses/[id]/toggle`. Exported `handleToggle` for testability. Uses `kv.atomic()` with optimistic concurrency check. Admin-only via existing `/api/admin/*` middleware.
- Task 05 (Business dashboard UI — profile editor) — add social media, hours, menu link fields to BusinessManager island. Show activation status banner.
