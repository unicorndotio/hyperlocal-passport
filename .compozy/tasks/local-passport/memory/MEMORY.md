# Shared Workflow Memory: local-passport

## Current State

- Tasks 01-12 and 14 are completed.
- Starting Task 13: Build Business Validation Dashboard.

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

## Open Risks

- (None yet)

## Handoffs

- (None yet)
