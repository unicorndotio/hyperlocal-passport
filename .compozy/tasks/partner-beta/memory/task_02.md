# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Updated the Business Profile API (`PUT /api/businesses/:id/profile`) to accept and validate new address fields (`cep`, `street`, `number`, `neighborhood`, `mapsUrl`) and category validation against `BUSINESS_CATEGORIES` taxonomy.

## Important Decisions

- Category validation: Created `BUSINESS_CATEGORIES` constant in `lib/business.ts` with 8 categories (Alimentação, Casa, Corpo, Esporte, Serviços, Náutica, Entretenimento, Outro). Merged categories from `BusinessManager.tsx` and `lib/signals.ts` for completeness.
- Address fields accept null/empty to clear: Users can unset fields by sending null or empty string.
- CEP is normalized to digits-only on save (e.g., `88000-000` → `88000000`).
- mapsUrl uses `new URL()` for validation (accepts any valid URL, no strict Google Maps domain check).
- Migration applied directly via SQL on the dev Postgres container.

## Learnings

- The DB business id column is `uuid` type — tests using non-UUID hardcoded IDs (like `'biz-profile-test-1'`) fail with `invalid input syntax for type uuid`. This is a pre-existing issue in `tests/routes/api/businesses/profile_test.ts`.
- `useDatabase()` helper triggers false-positive `react-rules-of-hooks` lint error; needs `// deno-lint-ignore` wrapper.

## Files / Surfaces

- `db/schema.ts` — added `cep`, `street`, `number`, `neighborhood`, `mapsUrl`, `expirationDate` columns
- `db/migrations/0001_add_business_address_fields.sql` — migration SQL
- `lib/business.ts` — added `BUSINESS_CATEGORIES`, `validateCep`, `validateMapsUrl`, `validateBusinessCategory`, `normalizeCep`, updated `Business` interface
- `routes/api/businesses/[id]/profile.ts` — added address + category field handling in both multipart and JSON branches
- `tests/business_profile_api.test.ts` — unit + integration tests

## Errors / Corrections

- `MAPS_URL_PREFIX` constant was defined but unused — removed to fix lint error.
- Missing `SessionUser` import in test file — added `import type`.
- `// deno-lint-ignore react-rules-of-hooks` separated from `useDatabase()` call during import edits — corrected.
- Type-check passes, lint passes, all 13 tests pass.

## Ready for Next Run
