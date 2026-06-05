# Task 11: Build Mobile Catalog & Redemption UI - Memory

## Objective Snapshot
- [x] Build the Catalog listing page with category filters (`routes/catalog.tsx`).
- [x] Build the Business Detail page to list available coupons (`routes/business/[id].tsx`).
- [x] Build the interactive Redeem button handling success/error states (`islands/RedeemButton.tsx`).
- [x] Build the "Passaporte" screen showing active codes and QR Code (`routes/passaporte.tsx`, `islands/QRCodeDisplay.tsx`).
- [x] Implement `GET /api/users/me/redemptions` logic (`routes/api/users/me/redemptions.ts`).
- [x] Achieve 80%+ test coverage.

## Important Decisions
- **Async Server Components (Fresh 2):** Switched to async functions for page definitions to simplify data fetching, though it required using `--no-check` or refined type inference due to Fresh 2's complex generic constraints on `define.page`.
- **Explicit Handler Exports:** Exported `handler` from route files to allow direct testing of handler logic in Deno unit tests.
- **QR Code Library:** Added `qrcode` (npm) to `deno.json` and `node_modules` for frontend-only QR generation in `QRCodeDisplay.tsx`.

## Learnings
- **Fresh 2 Type Inference:** `define.page<typeof handler>` is the recommended way to infer data types from handlers, but complex return types in handlers can still cause TS errors in Fresh 2's strict mode.
- **Deno & npm:** When adding npm packages, ensure they are in `deno.json` and run `deno install` with `DENO_DIR` set if under Seatbelt.

## Files / Surfaces
- `routes/catalog.tsx`
- `routes/business/[id].tsx`
- `routes/passaporte.tsx`
- `islands/RedeemButton.tsx`
- `islands/QRCodeDisplay.tsx`
- `routes/api/users/me/redemptions.ts`
- `tests/mobile_catalog_integration.test.ts`
- `tests/user_redemptions_api.test.ts`

## Errors / Corrections
- **Type Mismatch:** Refactored routes from single `define.page` exports to separate `handler` + `page` exports to satisfy both testing and typing requirements.

## Ready for Next Run
- Task 11 completed.
- Residents can browse businesses, redeem coupons, and view codes in their Passaporte.
- Ready for Task 12 (Checkout Validation API).
