---
provider: manual
pr:
round: 1
round_created_at: 2026-06-05T04:52:56Z
status: resolved
file: routes/api/users/register.ts
line: 77
severity: low
author: claude-code
provider_ref:
---

# Issue 006: Orphaned files on registration failure

## Review Comment

In `handleRegister`, files are uploaded to the local storage before the user record is committed to Deno KV.

```typescript
idPhotoFilename = await uploadFile(idPhoto, { userId, isPublic: false })
residenceProofFilename = await uploadFile(residenceProof, { userId, isPublic: false })

// ... prepare user object

const result = await kv.atomic()...commit()
if (!result.ok) {
  return json({ error: 'Failed to save user, please retry' }, 500)
}
```

If the `kv.atomic().commit()` fails (e.g., due to a conflict or temporary DB issue), the files have already been written to the filesystem and `file_metadata` has been written to KV (inside `uploadFile`). These files will remain on the server with no associated user record, leading to "orphaned" files.

**Suggested Fix:**
While difficult to solve perfectly without a distributed transaction, you could implement a cleanup routine or move the `uploadFile` call into a more robust retry logic, or simply acknowledge this as a known limitation for the MVP and plan for a periodic cleanup script.

## Triage

- Decision: `VALID`
- Notes: The issue is valid. I will add a basic cleanup block to `handleRegister` that attempts to delete the uploaded files if the atomic commit fails.

## Resolved
A cleanup block has been added to the `handleRegister` function in `routes/api/users/register.ts`. If the `kv.atomic().commit()` fails, the system now automatically attempts to delete the newly uploaded files using `deleteFile(filename)`, minimizing the accumulation of orphaned files on the server.
