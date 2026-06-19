---
provider: manual
pr:
round: 2
round_created_at: 2026-06-11T00:43:51Z
status: resolved
file: routes/api/businesses/[id].ts
line: 81
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Business update JSON path accepts arbitrary fields without validation

## Review Comment

The `PUT` handler in `routes/api/businesses/[id].ts` (admin business update) has two code paths: multipart/form-data and JSON. The JSON path at line 81 directly assigns the entire parsed request body to the update object:

```ts
updateData = body as Record<string, unknown>
```

This bypasses all field-level validation. Any JSON field sent in the request body — including `userId`, `id`, `createdAt`, or any future sensitive field — is blindly assigned to the business record via `adapter.update()` at line 106.

While this endpoint is gated behind admin-only middleware, the absence of field validation means:
- An admin could accidentally set `userId` to a different user, transferring business ownership without any confirmation step.
- Malformed or unexpected field types reach KV without type validation.
- The multipart path at least validates CNPJ format and `isActive` boolean parsing; the JSON path does none of this.

The profile update endpoint (`[id]/profile.ts`) handles this correctly by explicitly enumerating which fields are accepted.

**Fix:** Implement field-level filtering in the JSON path, explicitly enumerating writable fields:

```ts
const ALLOWED_FIELDS = ['name', 'companyName', 'cnpj', 'category', 'description', 'isActive', 'userId', 'logoUrl']
const updateData: Record<string, unknown> = {}
for (const key of ALLOWED_FIELDS) {
  if (key in body) {
    updateData[key] = body[key]
  }
}
if (typeof updateData.cnpj === 'string' && !isValidCnpj(updateData.cnpj as string)) {
  return new Response('Invalid CNPJ', { status: 400 })
}
```

Alternatively, reuse the same validation logic from the multipart path.

## Triage

- Decision: `VALID`
- Notes: The JSON path at line 81 (`updateData = body as Record<string, unknown>`) bypasses all field-level filtering. Fields like `id`, `createdAt`, and any future sensitive field can be blindly passed to `adapter.update()`. The multipart path explicitly enumerates each allowed field; the JSON path must do the same. Root cause: missing allowlist for writable fields. Fix: define `ALLOWED_FIELDS` and filter the parsed JSON body through it before further processing.
