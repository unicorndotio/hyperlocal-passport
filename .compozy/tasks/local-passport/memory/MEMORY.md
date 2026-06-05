# Shared Workflow Memory: local-passport

## Current State
- Tasks 01-09 and 14 are completed.
- Starting Task 10: Build Coupon Management UI.

## Shared Decisions
- **Hybrid Persistence (KV):** Use `kv-adapter.ts` for simple CRUD but direct `Deno.Kv` atomic operations for complex logic (like redemptions) to ensure strict consistency.

## Shared Learnings
- **Deno Testing & Seatbelt:** Set `DENO_DIR` to a local path (e.g., `.deno_cache`) to avoid "Operation not permitted" errors in macOS Seatbelt environments.
- **Fresh 2 Handler Testing:** `define.handlers` can be tested by invoking the handler methods directly with a mock context object.

## Open Risks
- (None yet)

## Handoffs
- (None yet)
