---
provider: manual
pr:
round: 2
round_created_at: 2026-06-05T05:12:23Z
status: resolved
file: lib/kv-adapter.ts
line: 111
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Stale secondary indexes in `kv-adapter.ts`

## Review Comment

The `update` and `delete` methods in `getDenoKvAdapterRaw` do not currently maintain the secondary indexes created in the `create` method.

```typescript
async update<T = Record<string, unknown>>(
  data: { model: string; where: { field: string; value: unknown }[]; update: T },
): Promise<T | null> {
  // ... updates the record but NOT the indexes
}
```

If an indexed field (like `email` or `userId`) is updated, the secondary index will still point to the old value. If a record is deleted, the index entry remains, pointing to a non-existent record.

**Suggested Fix:**
Update `update`, `updateMany`, `delete`, and `deleteMany` to also update or remove the corresponding index keys using `kv.atomic()`. This requires reading the existing record first to know which index keys to remove.

## Triage

- Decision: `VALID`
- Notes: The current implementation fails to maintain secondary indexes during update and delete operations. This leads to stale data and potentially incorrect lookups in `findOne` and `findMany`. I will refactor these methods to use atomic transactions that include index maintenance.
