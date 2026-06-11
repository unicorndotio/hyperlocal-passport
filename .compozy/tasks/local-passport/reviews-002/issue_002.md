---
provider: manual
pr:
round: 2
round_created_at: 2026-06-11T00:43:51Z
status: pending
file: routes/api/businesses/index.ts
line: 33
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Admin POST at /api/businesses does not check CNPJ uniqueness before creating business record

## Review Comment

The `POST` handler in `routes/api/businesses/index.ts` creates business records without verifying whether the CNPJ is already registered. The validation at lines 33–48 checks field presence and CNPJ format (`isValidCnpj`) but never queries the `businesses_by_cnpj` index for existing records.

The `adapter.create()` call (line 64, via `kv-adapter.ts`) also does not enforce uniqueness — it blindly writes the `businesses_by_cnpj` secondary index with `atomic.set()`, silently overwriting any previous entry for the same CNPJ.

This leads to data corruption:
- Two business records with the same CNPJ exist in KV, both functional under their own keys.
- The `businesses_by_cnpj` index points to the most recently created business only.
- Any CNPJ-based lookup returns the wrong business for the older record.
- The self-service registration endpoint (`register.ts`) correctly guards against this with `.check(existingCnpj)` at line 151, but the admin panel bypasses this protection.

**Fix:** Add a CNPJ uniqueness check before calling `adapter.create()`, following the same pattern used in `register.ts`:

```ts
const existingCnpj = await kv.get(['businesses_by_cnpj', normalizeCnpj(cnpj)])
if (existingCnpj.value !== null) {
  return new Response('CNPJ already registered', { status: 409 })
}
```

After the KV get, pass the `existingCnpj` entry through a `.check()` in the atomic commit. However, since `adapter.create()` encapsulates the atomic write internally, the simplest fix is to add the read-before-write check just before calling `adapter.create()`.

## Triage

- Decision: `UNREVIEWED`
- Notes:
