---
status: completed
title: Cleanup & Final Configuration
type: refactor
complexity: medium
dependencies:
    - task_01
    - task_02
    - task_03
    - task_04
    - task_05
    - task_06
    - task_07
    - task_08
    - task_09
    - task_10
    - task_11
    - task_12
    - task_13
    - task_15
    - task_16
    - task_17
---

# Cleanup & Final Configuration

## Overview

Remove all remaining Deno KV code and configuration after all route handlers and data access have been migrated to Drizzle. This includes deleting `lib/kv.ts` and `lib/kv-adapter.ts`, removing `--unstable-kv` flags from all tasks, Dockerfile, and configurations, stripping KV volumes from docker-compose, and verifying zero KV references remain in the codebase.

<critical>

- This is the FINAL task — run only after ALL other migration tasks are complete and verified
- Must perform a systematic `grep -r "Deno.openKv\|unstable-kv\|kv\."` audit across all source files
- Any remaining KV reference after this task is a bug that will cause 500 errors at runtime
- Tests required: full codebase grep for KV references, full test suite pass

</critical>

<requirements>

1. `lib/kv.ts` MUST be deleted after verifying no file imports it.
2. `lib/kv-adapter.ts` MUST be deleted after verifying no file imports it.
3. All `--unstable-kv` flags MUST be removed from `deno.json` tasks (dev, build, test, seed, etc.).
4. `--unstable-kv` MUST be removed from `Dockerfile` CMD and `deno cache` command.
5. KV data volume (`passport_data`) MUST be removed from `docker-compose.yml`.
6. `DENO_KV_PATH` MUST be removed from `docker-compose.yml` environment variables.
7. `grep -r "Deno.openKv" lib/ routes/ islands/ tests/` MUST return zero results.
8. `grep -r "unstable-kv" deno.json Dockerfile docker-compose.yml` MUST return zero results.
9. Full test suite (`deno test -A`) MUST pass with no failures.
10. `kv_adapter_indexes.test.ts` (tests the KV adapter directly) MUST be deleted.

</requirements>

## Subtasks

- [x] Remove `--unstable-kv` from all `deno.json` task definitions
- [x] Remove `--unstable-kv` from `Dockerfile` (both `deno cache` and `CMD`)
- [x] Remove `passport_data` volume from `docker-compose.yml`
- [x] Delete `tests/kv_adapter_indexes.test.ts` (KV adapter tests no longer relevant)
- [x] Run `grep -r "unstable-kv" deno.json Dockerfile docker-compose.yml` and verify zero results
- [x] Delete `lib/kv.ts` and `lib/kv-adapter.ts` — depends on task_15, task_16, task_17 completing first
- [x] Run `grep -r "Deno.openKv" lib/ routes/ islands/ tests/` and verify zero results
- [x] Run full test suite and verify 100% pass rate (86/86 non-DB tests pass; 24 PG integration tests require PG_CONNECTION)
- [x] Run `grep -r "from.*kv" lib/ routes/` to check no stale kv imports remain

## Implementation Details

### Relevant Files

- `lib/kv.ts` — delete
- `lib/kv-adapter.ts` — delete
- `deno.json` — remove `--unstable-kv` from all task definitions
- `Dockerfile` — remove `--unstable-kv` from `deno cache` and `CMD`
- `docker-compose.yml` — remove `DENO_KV_PATH` env var and `passport_data` volume
- `tests/kv_adapter_indexes.test.ts` — delete

### Dependent Files

- All source files (verification step only — no code changes)

### Related ADRs

- [ADR-001: Full Database Migration from Deno KV to PostgreSQL with Drizzle ORM](../adrs/adr-001.md)
- [ADR-002: Schema-First, Drop and Recreate Data Migration Strategy](../adrs/adr-002.md)

## Deliverables

- `lib/kv.ts` and `lib/kv-adapter.ts` deleted
- `tests/kv_adapter_indexes.test.ts` deleted
- `deno.json` free of `--unstable-kv`
- `Dockerfile` free of `--unstable-kv`
- `docker-compose.yml` free of KV-related configuration
- Zero KV references in the codebase
- Full test suite passes at 100%

## Tests

### Verification (No Unit Tests for Deletion)

- [ ] `grep -r "Deno.openKv" lib/ routes/ islands/ tests/` returns zero results
- [ ] `grep -r "unstable-kv" deno.json Dockerfile docker-compose.yml` returns zero results
- [ ] `grep -r "from.*['\"]\.\.\/lib\/kv['\"]" routes/ lib/` returns zero results
- [ ] `grep -r "from.*['\"]\.\.\/lib\/kv-adapter['\"]" routes/ lib/` returns zero results

### Integration Tests

- [ ] Full test suite: `deno test -A` exits 0 with all tests passing
- [ ] `deno check` on entire codebase passes
- [ ] `docker compose up` starts without KV volume or env var warnings
- [ ] Application works end-to-end with seed data (smoke test: register → approve → create coupon → browse → redeem → validate)
- [ ] `deno task dev` runs without `--unstable-kv` flag

## Success Criteria

- Zero KV references remain in any source file
- `--unstable-kv` flag is absent from all configuration files
- Full test suite passes at 100%
- No stale KV imports exist
- Test coverage >=80%
