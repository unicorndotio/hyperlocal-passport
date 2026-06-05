---
provider: manual
pr:
round: 3
round_created_at: 2026-06-05T07:35:00Z
status: resolved
file: routes/api/users/register.ts
line: 27
severity: low
author: claude-code
provider_ref:
---

# Issue 004: Duplicated json() response helper across route files

## Review Comment

A `json()` helper function is defined identically in two route files:

- `routes/api/users/register.ts:27-32`
- `routes/api/uploads/[filename].ts:21-26`

```typescript
function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

This duplicates the same 6 lines across two files. Other route files (e.g., `routes/api/admin/approvals/[userId].ts`) inline the same `JSON.stringify` + `new Response` pattern inline, adding further inconsistency.

**Suggested Fix:**
Export a shared `json()` helper from `lib/utils.ts` alongside the existing `cn()` and `formatBRL()` utilities:

```typescript
export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

Then import and use it from all route files that need to return JSON responses. This reduces duplication and ensures consistent Content-Type headers across all API responses.

## Triage

- Decision: `VALID`
- Notes: Added shared `json()` export to lib/utils.ts. Replaced local definitions in routes/api/users/register.ts and routes/api/uploads/[filename].ts with imports from lib/utils.ts. Verified with `tests/register.test.ts` (1 passed, 10 steps).
