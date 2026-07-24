# Database Reliability Standardization — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | PK type migration — 8 app tables `text` to `uuid` | completed | high | — |
| 02 | FK hardening — explicit `onDelete` on all 15 FKs + missing FK | completed | high | task_01 |
| 03 | Timezone + Indexes — `withTimezone`, 4 indexes, `$onUpdate` | completed | medium | task_01 |
| 04 | Seed realignment — `crypto.randomUUID()` replacing hardcoded IDs | completed | medium | task_02, task_03 |
| 05 | Analytics query — typed Drizzle UPSERT for `incrementViewCount` | pending | low | task_02, task_03 |
| 06 | Feed query + MV — `feedEvents` pgTable + typed Drizzle in `queryFeed` | completed | medium | task_02, task_03 |
| 07 | Test DB utility — `lib/test-db.ts` with `useDatabase()` | completed | medium | — |
| 08 | Migration generation — `drizzle-kit generate`, review SQL | completed | low | task_04, task_05, task_06, task_07 |
| 09 | CI + Conventions guide — `check-schema-conventions.ts` + `DB_CONVENTIONS.md` | completed | medium | task_03 |
