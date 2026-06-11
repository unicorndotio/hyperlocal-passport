---
provider: manual
pr:
round: 3
round_created_at: 2026-06-11T01:00:00Z
status: resolved
file: routes/api/businesses/[id].ts
line: 34
severity: low
author: claude-code
provider_ref:
---

# Issue 004: CNPJ not normalized on update, causing inconsistent formatting in storage

## Review Comment

The business update endpoints at `routes/api/businesses/[id].ts` accept CNPJ values without normalizing them (stripping non-digit characters), while the create endpoints (`register.ts:70`, `index.ts:37`) call `normalizeCnpj()` before saving. This occurs in two code paths:

1. **Multipart path** (line 29–35): The raw `cnpj` from the form is stored as-is: `updateData.cnpj = cnpj`.
2. **JSON path** (line 106–109): The raw `cnpj` from the request body passes through via the ALLOWED_FIELDS loop (lines 91–96) without normalization.

This means a formatted CNPJ like `12.345.678/0001-90` gets stored in the update path, while `12345678000190` is stored by the create path. The `businesses_by_cnpj` secondary index always stores the normalized form (set by the create path), but the primary business record can contain either format. Subsequent lookups or comparisons that don't normalize before matching may fail for records created via the update path.

The `normalizeCnpj()` function is already imported (line 30 of `routes/api/businesses/index.ts`) in the admin index route, and `isValidCnpj` (which internally calls `normalizeCnpj`) is imported in `[id].ts` (line 5), so the fix requires only a one-line normalization call.

**Fix:** In `routes/api/businesses/[id].ts`, add normalization after validation:

Multipart path (after line 33):
```ts
if (cnpj) {
  if (!isValidCnpj(cnpj)) {
    return new Response('Invalid CNPJ', { status: 400 })
  }
  updateData.cnpj = normalizeCnpj(cnpj)
}
```

JSON path (after line 108):
```ts
if (typeof cnpj === 'string') {
  if (!isValidCnpj(cnpj)) {
    return new Response('Invalid CNPJ', { status: 400 })
  }
  updateData.cnpj = normalizeCnpj(cnpj)
}
```

Also affected: `routes/api/businesses/[id]/coupons.ts` is not affected (coupons don't store CNPJ).

## Triage

- Decision: `VALID`
- Root cause: `normalizeCnpj()` was imported in the create/index routes but not in `[id].ts`. The update handler stored the raw CNPJ value without normalizing, causing inconsistent formatting between create and update paths.
- Changes made:
  1. Added `normalizeCnpj` to the import from `../../../lib/business.ts` (line 5)
  2. **Multipart path** (line 34): Changed `updateData.cnpj = cnpj` to `updateData.cnpj = normalizeCnpj(cnpj)`
  3. **JSON path** (lines 106-112): Restructured the conditional to normalize the CNPJ after validation passes
- Verification: `deno fmt --check .` (117 files checked, clean), `deno lint` (110 files, clean), `deno check` (pre-existing type errors in `main.ts:10` and `routes/index.tsx:9` — unrelated `Property 'shared'` errors, not introduced by this change), `deno test -A --unstable-kv` (110 passed, 0 failed, 1 ignored — same as pre-existing baseline).
- Notes: Low severity because these update endpoints are admin-only (gated by the middleware at `routes/_middleware.ts:43-48`), so inconsistent CNPJ formatting only affects records manually updated by an admin, not end-user operations. However, inconsistent data in the primary business record could cause comparison issues in future features.
