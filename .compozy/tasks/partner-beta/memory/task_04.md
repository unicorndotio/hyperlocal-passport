# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Update Partner Profile frontend with new address inputs, read-only company fields, and new category taxonomy.

## Important Decisions

- Used the PRD-specified 14-category taxonomy as the single source of truth in `BUSINESS_CATEGORIES`.
- Read-only fields (Nome Fantasia, Razão Social, CNPJ) displayed as styled `<p>` elements in a subtle grey card, not as disabled inputs.
- Category dropdown populated from `BUSINESS_CATEGORIES` constant, placed between description and address sections.
- Address fields (CEP, street, number, neighborhood) laid out in a 2-column grid; Google Maps URL as a single full-width field.
- CEP validated on client side (8 digits after stripping non-digits); maps URL validated with `new URL()` try-catch.
- Normalized CEP via `normalizeCep()` before appending to FormData (dash stripped).
- Empty CEP/mapsUrl sent as empty string to API handler (which maps it to null on backend).

## Learnings

- The API handler already fully supports all new fields in both multipart/form-data and JSON paths.
- The `Business` interface already included all address fields from task 02.
- `formatCnpjDisplay` from `lib/business.ts` can be reused for the read-only CNPJ display.

## Files / Surfaces

- `lib/business.ts` — updated `BUSINESS_CATEGORIES` constant (14 categories)
- `islands/BusinessProfileEditor.tsx` — added read-only company section, category dropdown, address fields, maps URL, updated validate() and handleSubmit()
- `tests/business_profile_ui.test.ts` — updated test data, added rendering/prefill assertions for new fields, updated submission test
- `tests/business_profile_api.test.ts` — updated category values to match new taxonomy
- `tests/lib/business.test.ts` — no changes needed (tests use dynamic BUSINESS_CATEGORIES)

## Errors / Corrections

## Ready for Next Run
