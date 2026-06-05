# Shared Workflow Memory: local-passport

## Current State

- All MVP tasks (01-14) are completed.
- System is ready for final quality audit and production deployment readiness check.

## Shared Decisions

- **Hybrid Persistence (KV):** Use `kv-adapter.ts` for simple CRUD but direct
  `Deno.Kv` atomic operations for complex logic (like redemptions and
  transactions) to ensure strict consistency.
- **KV Key Pattern:** Use flat keys (e.g., `['coupons', id]`) as implemented in
  `kv-adapter.ts` for consistency across the codebase, diverging from
  hierarchical techspec suggestions where simpler.
- **Transaction Indexing:** Use
  `['business_transactions', businessId, timestamp]` and
  `['user_transactions', userId, timestamp]` for historical tracking.
- **SSR-Safe Islands:** Use dynamic imports (`await import(...)`) for
  browser-only libraries (like `html5-qrcode`) to prevent SSR crashes.

## Shared Learnings

- **Deno Testing & Seatbelt:** Set `DENO_DIR` to a local path (e.g.,
  `.deno_cache`) to avoid "Operation not permitted" errors in macOS Seatbelt
  environments.
- **Fresh 2 Handler Testing:** `define.handlers` can be tested by invoking the
  handler methods directly with a mock context object. Export `handler`
  explicitly from route files to facilitate this.
- **Fresh 2 Type Inference:** Use `define.page<typeof handler>` to infer data
  types. For complex handlers, ensure the return type matches Fresh 2's expected
  `PageProps` structure.
- **Development Tasks:** Use `deno task lint`, `deno task type-check`,
  `deno task test:cov`, and `deno task coverage` for standardized CI/CD and
  local development workflows.
- **BRL Currency Input:** Sanitizing inputs by removing non-digits and parsing
  as cents is the most reliable way to handle BRL currency values.

## Open Risks

- (None yet)

## Handoffs

- **Quality Audit:** Perform a full sweep of the UI for consistency (BRL formatting, loading states, error handling).
- **Security Check:** Verify middleware coverage across all protected routes.
- **Deployment Prep:** Configure production Deno KV and file storage volumes.
