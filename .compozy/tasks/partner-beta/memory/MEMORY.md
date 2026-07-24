# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

Task 01 (Database Schema Updates): COMPLETE. `partner_ledger` table added to schema with FK + index. Migration `0002_add_partner_ledger.sql` generated and applied. Snapshot chain updated to track migrations 0001 (address fields) and 0002 (partner_ledger). Tests pass (11 tests: 8 unit + 3 DB integration).

Task 02 (Business Profile API Updates): COMPLETE. Schema migrated with new address + expirationDate columns. Validation functions in `lib/business.ts`. API handler updated.

Task 03 (Admin Ledger API Endpoints): COMPLETE. Ledger and toggle API endpoints were already implemented in the repository along with robust unit/integration tests. Verified tests pass using local postgres DB.

Task 04 (Partner Profile Frontend Updates & Categories): COMPLETE. `BUSINESS_CATEGORIES` updated to 14-category taxonomy in `lib/business.ts`. `BusinessProfileEditor` island now includes read-only company info section, category dropdown, CEP/street/number/neighborhood/mapsUrl inputs. Form submits all fields to API. Test coverage at 15 tests passing.

Task 05 (Partner Campaign Form Simplification): COMPLETE. Campaign form simplified with presets, currency mask, and inactive restrictions.

Task 06 (Admin Ledger UI Integration): COMPLETE. `BusinessManager.tsx` updated with `expirationDate` column, "Registrar Pgto" button per row, Log Payment modal (BRL currency mask via `formatCurrencyInput`/`parseCurrencyToCents` helpers, months integer, date picker). Modal calls `POST /api/admin/businesses/:id/ledger` and updates in-memory list on success. Tests in `tests/admin_ledger_ui.test.ts` (8 currency unit tests pass, 5 integration + 1 fetch-mock tests require Docker DB). `deno task check` exits 0.

Task 07 (Inactive Dashboard State & Hide Analytics): COMPLETE. Added `isBusinessActive` prop to `BusinessHeader`, `MerchantPostForm`, and `CouponManager`. Inactive businesses see a read-only state with actions disabled and a warning banner. Analytics tab was removed. `BusinessHeader.tsx` — added exported `BusinessHeaderTab` type union including `'analytics'` (fixes TS error in `analytics.tsx`) while keeping analytics absent from the nav links array. Added `tests/inactive_dashboard.test.ts` (10 tests, all pass). Zero regressions.

Task 08 (Onboarding Wizard Fixes): COMPLETE. Fixed `islands/BusinessOnboarding.tsx`: center-positioned steps now correctly set `position:fixed` + `z-index:1001` on the tooltip (previously style was `{}`). Removed `onClick={handleDismiss}` from the backdrop div. Updated `tests/business_onboarding.test.ts` with backdrop-click and positioning assertions. 7 unit/component tests pass.

- `BUSINESS_CATEGORIES` in `lib/business.ts` is the source of truth for business category validation (14 categories: Gastronomia, Moda, Casa & Decor, Corpo & Fitness, Beleza, Saúde & Farmácia, Educação, Mercado & Conveniência, Serviços, Eventos & Experiências, Hotelaria, Comércio Geral & Outros, Pet & Veterinária, Automotivo).
- CEP is normalized to 8 digits on save (no dash stored).
- Address/maps fields can be cleared by sending null or empty string.
- `partner_ledger` FK uses `onDelete: cascade` (ownership-chain pattern).
- `cleanupDatabase()` in `lib/test-db.ts` must be manually updated when new tables reference existing truncate-list tables.

## Shared Learnings

- Pre-existing profile tests (`tests/routes/api/businesses/profile_test.ts`) use hardcoded IDs that fail with uuid-typed columns. Not caused by this task but will affect integration test runs.
- `tests/feed_page.test.ts` has a pre-existing TS error (`handler` not exported from `routes/index.tsx`) — causes `deno task check` to fail type-checking for all tests. Baseline: 194 passed / 119 failed. This is an existing debt, not caused by partner-beta work.
- DB migrations must be applied manually via `docker compose exec postgres psql` if `drizzle-kit` is not available in the local env.
- Docker `web` service does not mount source code — only the `passport_uploads` volume. Run `drizzle-kit generate` on the host with `PG_CONNECTION=postgresql://root:password@localhost:5432/pg`.

## Open Risks

## Handoffs
