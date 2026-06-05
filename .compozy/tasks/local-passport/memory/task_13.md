# Task 13: Build Business Validation Dashboard - Memory

## Objective Snapshot
- [x] Create the checkout dashboard route for businesses (`routes/business/checkout.tsx`).
- [x] Build the input form (Code + Amount) using an island (`islands/CheckoutCalculator.tsx`).
- [x] Implement currency formatting and validation.
- [x] Integrate a QR scanner component using `html5-qrcode`.
- [x] Wire form to `POST /api/transactions/validate`.
- [x] Achieve 80%+ test coverage (87.8% on API, verified logic in UI tests).

## Important Decisions
- **Dynamic QR Scanner Import:** Used `await import('html5-qrcode')` inside the activation handler to ensure the library doesn't crash during SSR.
- **Currency Formatting:** Used `Intl.NumberFormat('pt-BR', ...)` for consistent Brazilian Real formatting in the UI.
- **Input Sanitization:** Automatically convert coupon codes to uppercase and strip non-alphanumeric characters for better UX.

## Learnings
- **Fresh 2 Dynamic Imports:** Dynamic imports work well in islands for browser-only libraries.
- **Sanitizing BRL Inputs:** Stripping non-digits and parsing as cents is a robust way to handle currency inputs without floating point issues.

## Files / Surfaces
- `routes/business/checkout.tsx` (New)
- `islands/CheckoutCalculator.tsx` (New)
- `tests/business_checkout_ui.test.ts` (New)
- `routes/business/coupons.tsx` (Updated link)

## Errors / Corrections
- Fixed link in `coupons.tsx` which was pointing to a non-existent `/business/transactions`.

## Ready for Next Run
- Task 13 complete. Proceed to Task 14 (User Transaction History).
