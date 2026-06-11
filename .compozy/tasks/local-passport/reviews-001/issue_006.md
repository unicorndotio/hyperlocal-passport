---
provider: manual
pr:
round: 1
round_created_at: 2026-06-10T20:00:00Z
status: pending
file: routes/api/businesses/register.ts
line: 127
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: Unbounded `description` field accepted in registration and profile update

## Review Comment

The `description` field is accepted from user input in two places without any max-length validation:

- `routes/api/businesses/register.ts:127` — `description` stored directly via `formData.get('description')` and trimmed but not length-checked.
- `routes/api/businesses/[id]/profile.ts:43` — `description` stored directly in the JSON and multipart paths.

An unbounded description could store arbitrarily large text in the KV business record, contributing to KV entry size limits (Deno KV has a practical per-value limit of ~100 KB). It is also a potential abuse vector.

The demand signal system has a 500-char limit on description (`lib/signals.ts:63–64`), which sets a good precedent for the codebase.

**Fix:** Add a consistent max-length validation (e.g., 1000 characters) to both endpoints:

In `routes/api/businesses/register.ts`:
```ts
const description = formData.get('description')
if (description && typeof description === 'string' && description.trim().length > 1000) {
  return json({ error: 'Description must be at most 1000 characters' }, 400)
}
```

Apply the same check in `routes/api/businesses/[id]/profile.ts` in both the multipart and JSON branches.

## Triage

- Decision: `UNREVIEWED`
- Notes: Also affects `routes/api/businesses/[id]/profile.ts` line 43 (JSON path) and line 41 (multipart path).
