---
provider: manual
pr:
round: 1
round_created_at: 2026-06-26T14:36:00Z
status: resolved
file: routes/api/users/register.ts
line: 143
severity: high
author: claude-code
provider_ref:
---

# Issue 002: User documents saved as array instead of object breaking admin UI

## Review Comment

In [routes/api/users/register.ts](file:///Users/dev/nodo/passport/deno/routes/api/users/register.ts#L143-L149), the user `documents` column is populated with a single-element array containing the document URLs object:
```ts
documents: [
  {
    idPhotoUrl: `${baseUrl}/api/uploads/${idPhotoFilename}`,
    residenceProofUrl: `${baseUrl}/api/uploads/${residenceProofFilename}`,
  },
]
```
However, the returned JSON structure is an object (line 103), and the frontend admin dashboard [islands/ApprovalDashboard.tsx](file:///Users/dev/nodo/passport/deno/islands/ApprovalDashboard.tsx#L284-L287) reads the properties directly as an object:
```ts
idPhoto: user.documents?.idPhotoUrl || '',
residenceProof: user.documents?.residenceProofUrl || '',
```
Because the database stores this column as a JSON array, the direct properties evaluate to `undefined` in the admin UI, preventing administrators from viewing the uploaded document photos.

### Suggested Fix

Modify the database insert statement in `register.ts` to save the `documents` directly as an object:

```ts
documents: {
  idPhotoUrl: `${baseUrl}/api/uploads/${idPhotoFilename}`,
  residenceProofUrl: `${baseUrl}/api/uploads/${residenceProofFilename}`,
}
```

## Triage

- Decision: `VALID`
- Root cause: DB insert on line 143 wrapped `documents` in an array `[{...}]` but the admin UI (`ApprovalDashboard.tsx:284-287`) reads `user.documents?.idPhotoUrl` directly as object properties. The `jsonb('documents')` column in the schema accepts both, but the consumer expects an object.
- Fix: Removed the array wrapper in the `db.transaction` insert block. The `user` object returned in the 201 response was already correct (object format at line 103-106).
