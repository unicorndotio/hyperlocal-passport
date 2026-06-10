# Shared Workflow Memory: local-passport

## Current State

- Task 01 (Extend Business data model) — **complete**
- Task 02 (Self-service business registration endpoint) — **complete**
- Task 03 (Business profile management API) — **next**
- Task 01 introduced `socialLinks` and `openingHours` fields to the `Business` interface with validation helpers.

## Shared Decisions

- `OpeningHours` typed as `Partial<Record<string, OpeningHoursEntry>>` — allows partial schedules, day-key access via `DAYS` array.
- `BusinessFormErrors` uses top-level `socialLinks` and `openingHours` string keys (object-level errors, not per-sub-field). Registration endpoint should return error keys matching this shape.
- `cnpj` added to `INDEXED_FIELDS.businesses` in `kv-adapter.ts` — CNPJ uniqueness checks are O(1) via `businesses_by_cnpj` index. Future business operations can rely on this index.

## Shared Learnings

- (No cross-task learnings yet.)

## Open Risks

- (None)

## Handoffs

- Task 03 (Business profile management API) should reuse `validateSocialLinks`, `validateOpeningHours` from `lib/business.ts` for profile update validation.
- Task 03 needs ownership check (business userId matches session userId) — pattern not yet implemented, needs design.
