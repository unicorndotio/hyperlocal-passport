# db-migration — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Infrastructure Setup | completed | low | — |
| 02 | Schema Definition & Initial Migration | completed | medium | — |
| 03 | Drizzle Client Singleton | completed | low | task_02 |
| 04 | Better Auth Drizzle Adapter | completed | medium | task_02, task_03 |
| 05 | File Metadata Migration | completed | low | task_02, task_03 |
| 06 | User Registration & Approval Routes | completed | medium | task_02, task_03, task_04 |
| 07 | Business Routes Migration | completed | high | task_02, task_03, task_04 |
| 08 | Coupon & Redemption Routes Migration | completed | high | task_02, task_03, task_04 |
| 09 | Transaction Validation Route | completed | medium | task_02, task_03, task_04 |
| 10 | Signals Routes & Rate Limit Removal | completed | medium | task_02, task_03, task_04 |
| 11 | Admin Routes Migration | completed | high | task_02, task_03, task_04 |
| 12 | User Redemptions & Upload Routes | completed | low | task_02, task_03, task_04 |
| 13 | Seed Script Rewrite | completed | low | task_02, task_03, task_04 |
| 14 | Cleanup & Final Configuration | completed | medium | task_01, task_02, task_03, task_04, task_05, task_06, task_07, task_08, task_09, task_10, task_11, task_12, task_13, task_15, task_16, task_17 |
| 15 | Migrate Resident-Facing Page Routes to Drizzle | completed | medium | task_02, task_03 |
| 16 | Migrate Business Page Routes to Drizzle | completed | high | task_02, task_03, task_04 |
| 17 | Migrate Remaining Test Files to Drizzle and passport_test Database | completed | high | task_02, task_03, task_04, task_15, task_16 |

