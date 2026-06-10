# Task 01: Extend Business data model with socialLinks and openingHours — Memory

## Objective Snapshot

- [x] Add `socialLinks` (instagram, facebook, whatsapp, menu) and `openingHours` (monday–sunday map with `{open, close}` in 24h HH:MM format) to the `Business` interface.
- [x] Extend `BusinessFormErrors` with `socialLinks` and `openingHours` error keys.
- [x] Add `validateOpeningHours` and `validateSocialLinks` helper functions.
- [x] Write unit tests — 20 new test steps, all passing.
- [x] Coverage: 97.5% line / 100% function / 98.9% branch on `lib/business.ts`.

## Important Decisions

- `OpeningHours` typed as `Partial<Record<string, OpeningHoursEntry>>` allowing partial schedules with day-key access.
- `validateOpeningHours` validates day keys against `DAYS` array, HH:MM via regex, and open < close ordering.
- `validateSocialLinks` uses `new URL()` constructor for URL validation (zero dependencies).
- Both validators return `undefined` for null/undefined input (fields optional).
- Error messages in Portuguese matching existing validation style.
- `BusinessFormErrors` uses top-level `socialLinks` and `openingHours` strings (object-level errors, not per-sub-field).

## Learnings

- Deno KV not involved here — pure data model + validation changes.
- Test conventions use `assertStrictEquals` for `undefined` checks and `assertEquals` for string error messages.

## Files / Surfaces

- `lib/business.ts` — Business interface, BusinessFormErrors, validation functions
- `tests/lib/business.test.ts` — Unit tests for new validation logic

## Errors / Corrections

- (None)

## Ready for Next Run

- Task 01 complete. `Business` type now includes `socialLinks` and `openingHours`. Validation helpers ready. All existing CRUD routes pass through the new fields unchanged via the adapter. Next: Task 02 (Self-service business registration endpoint).
