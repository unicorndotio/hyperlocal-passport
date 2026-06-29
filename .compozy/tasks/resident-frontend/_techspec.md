# TechSpec: Resident Frontend — Passaporte Local V1

## Executive Summary

The Resident Frontend V1 transforms the existing catalog-and-passport app into a feed-first experience with a hybrid content stream, merchant publishing, and a premium digital passport. Four architectural decisions shape the implementation:

1. **Feed data model**: a PostgreSQL materialized view (`feed_events`) unions global content (merchant posts, coupon releases, admin announcements) into a single queryable source. User-specific transaction savings are fetched separately. This avoids both dual-write complexity and in-memory union-query pagination.
2. **Route reorganisation**: the feed becomes the root route `/`, the catalog stays at `/catalog`, the passport at `/passaporte`. The duplicated bottom navigation is extracted into a shared `components/BottomNav.tsx`.
3. **Passport animation**: a dedicated `PassportCover` island with `useSignal`-driven CSS transitions for the open/closed/locked states.
4. **Merchant posts**: stored in a new `merchant_posts` table with an `isVisible` moderation gate; creation triggers `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

The primary trade-off is MV staleness: events take ~500ms to appear after creation (refresh-on-write). This is acceptable for a social feed and avoids complex multi-source cursor pagination.

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Fresh 2 Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  / (feed) │  │ /catalog │  │/passaporte│  │/business │   │
│  │  route    │  │  route   │  │  route    │  │ /[id]    │   │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│        │              │             │              │         │
│  ┌─────┴──────────────┴─────────────┴──────────────┴─────┐  │
│  │             components/BottomNav.tsx                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PassportCover│  │QRCodeDisplay│  │  RedeemButton    │  │
│  │   island     │  │   island    │  │    island        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │                lib/ (business logic)                    │  │
│  │  auth.ts | db.ts | coupon.ts | coupon-engine.ts |     │  │
│  │  business.ts | registration.ts | storage.ts | utils.ts│  │
│  └──────────────────────────┬─────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴─────────────────────────────┐  │
│  │              PostgreSQL (Drizzle ORM)                   │  │
│  │  users | businesses | coupons | redemptions |          │  │
│  │  transactions | merchant_posts | file_metadata | ...   │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Type | Responsibility |
|---|---|---|
| Feed route (`/`) | Page route + handler | Queries `feed_events` MV for global content + `transactions` for user-specific savings; merges and paginates |
| Catalog route (`/catalog`) | Page route (existing) | Lists businesses with category filter — minor update to use shared BottomNav |
| Passport route (`/passaporte`) | Page route (existing) | Fetches active redemptions; minor update to use shared BottomNav |
| Business detail (`/business/[id]`) | Page route (existing) | Shows business profile + coupons — minor update to use shared BottomNav |
| `BottomNav` | UI component | Shared bottom navigation bar (not an island — no client state) |
| `PassportCover` | Island | Passport cover with open/closed/locked states; uses `QRCodeDisplay` for QR codes |
| `QRCodeDisplay` | Island (existing) | Generates QR code canvas from redemption code |
| `RedeemButton` | Island (existing) | POSTs to redeem endpoint, redirects on success |
| Merchant post API | API route | CRUD for merchant-authored posts (`POST /api/posts`); triggers MV refresh on write |
| Savings history API | API route | Returns used redemptions with discount totals (`GET /api/users/me/savings`) |
| Feed handler logic | lib module | MV query builder, pagination cursor, user-specific transaction query, event type mapping |

## Implementation Design

### Materialized View

```sql
CREATE MATERIALIZED VIEW feed_events AS
SELECT
  mp.id::text || '-merchant' AS id,
  'merchant_post' AS type,
  mp.title,
  mp.body AS description,
  mp.image_url AS image_url,
  mp.business_id AS business_id,
  b.name AS business_name,
  mp.created_at::timestamptz AS created_at
FROM merchant_posts mp
JOIN businesses b ON b.id = mp.business_id
WHERE mp.is_visible = true

UNION ALL

SELECT
  c.id::text || '-coupon' AS id,
  'coupon_released' AS type,
  c.title,
  c.description,
  NULL::varchar AS image_url,
  c.business_id,
  b.name AS business_name,
  c.created_at::timestamptz AS created_at
FROM coupons c
JOIN businesses b ON b.id = c.business_id
WHERE c.is_active = true

ORDER BY created_at DESC;

-- Required for CONCURRENTLY refresh:
CREATE UNIQUE INDEX idx_feed_events_id ON feed_events (id);
```

The MV is refreshed on-write: after each merchant post or coupon creation, the handler calls `REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`.

### Core Interfaces

```typescript
// lib/feed.ts — Feed event types and query logic

type FeedEventType = 'merchant_post' | 'coupon_released' | 'savings_notice' | 'admin_announcement'

interface FeedEvent {
  id: string
  type: FeedEventType
  title: string
  description: string
  imageUrl?: string
  businessId?: string
  businessName?: string
  amountCents?: number
  createdAt: number // unix ms, used as sort key
}

interface FeedQueryResult {
  events: FeedEvent[]
  cursor: string | null // last createdAt for cursor-based pagination
}

async function queryFeed(
  db: Database,
  userId: string | null,    // null for unauthenticated users
  cursor?: string,
  limit?: number,
): Promise<FeedQueryResult>
// Queries the feed_events MV for global content, then appends
// user-specific transaction savings from the transactions table.
// Merges both sources ordered by createdAt DESC.
```

```typescript
// islands/PassportCover.tsx — Primary state machine

interface PassportCoverProps {
  status: 'approved' | 'pending' | 'rejected'
  redemptions: Array<{
    id: string
    businessName: string
    redeemedAt: number
  }>
  savingsHistory: SavingsSummary
}
```

### Data Models

#### New: `merchant_posts` table

```typescript
// db/schema.ts additions
const merchantPosts = pgTable('merchant_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  imageUrl: varchar('image_url', { length: 500 }),
  isVisible: boolean('is_visible').notNull().default(false), // moderation gate
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

#### Savings summary response type

```typescript
interface SavingsSummary {
  totalSavingsCents: number
  totalRedemptions: number
  byBusiness: Array<{
    businessId: string
    businessName: string
    savingsCents: number
    count: number
  }>
}
```

#### Feed event sources

| Source | Scope | How queried | FeedEvent.type |
|---|---|---|---|
| `feed_events` MV (merchant_posts + coupons + announcements) | Global | Single MV query with cursor pagination | `merchant_post`, `coupon_released`, `admin_announcement` |
| `transactions` (recent, own) | User-specific | Separate query by userId, joined with businesses for name | `savings_notice` |

### API Endpoints

#### New: Merchant post publishing

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/posts` | Business | Create a merchant post (title, body, optional image) |
| GET | `/api/posts` | Business | List own posts |
| PUT | `/api/posts/[id]` | Business | Update own post |
| DELETE | `/api/posts/[id]` | Business | Delete own post |

**POST /api/posts** — request:
```json
{
  "title": "Banana Festival This Weekend!",
  "body": "20% off all banana-based products...",
  "imageUrl": "https://..."
}
```

**Response** (201):
```json
{
  "id": "uuid",
  "title": "Banana Festival This Weekend!",
  "body": "20% off all banana-based products...",
  "imageUrl": "https://...",
  "isVisible": false,
  "createdAt": "2026-06-29T12:00:00Z"
}
```

#### New: Savings history

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me/savings` | Resident | Returns used redemptions with discount amounts and total savings |

**GET /api/users/me/savings** — response (200):
```json
{
  "totalSavingsCents": 4500,
  "totalRedemptions": 12,
  "byBusiness": [
    { "businessId": "uuid", "businessName": "Padaria do Joao", "savingsCents": 2000, "count": 5 }
  ]
}
```

#### Modified: Feed endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/feed` | Optional | Returns paginated feed events from the MV; appends user's transaction savings if authenticated |

**GET /api/feed?cursor=1719600000000&limit=20** — response (200):
```json
{
  "events": [
    {
      "id": "src-uuid",
      "type": "merchant_post",
      "title": "Banana Festival",
      "description": "20% off all items!",
      "imageUrl": "https://...",
      "businessId": "uuid",
      "businessName": "Padaria do Joao",
      "createdAt": 1719600000000
    }
  ],
  "cursor": "1719600000020"
}
```

## Integration Points

None. All data lives in the existing PostgreSQL database. The merchant image upload path reuses the existing `lib/storage.ts` file upload mechanism and `file_metadata` table for upload tracking. No external services are introduced.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|---|---|---|---|
| `routes/index.tsx` | Modified | Replace Fresh boilerplate with feed page handler + render | Rewrite route, keep `_app.tsx` shell |
| `routes/catalog.tsx` | Modified | Import shared BottomNav instead of inline nav; no functional change | Replace inline nav with `<BottomNav active="catalog" />` |
| `routes/passaporte.tsx` | Modified | Import shared BottomNav; render PassportCover island instead of flat list | Replace inline nav + list with `<BottomNav>` and `<PassportCover>` |
| `routes/business/[id].tsx` | Modified | Import shared BottomNav instead of inline nav | Replace inline nav with `<BottomNav active="catalog" />` |
| `components/BottomNav.tsx` | New | Shared bottom navigation bar component | Create new file |
| `islands/PassportCover.tsx` | New | Passport cover with animation states | Create new island |
| `routes/api/posts/index.ts` | New | Merchant post CRUD | Create new API route |
| `routes/api/posts/[id].ts` | New | Merchant post single-resource CRUD | Create new API route |
| `routes/api/feed.ts` | New | Paginated feed event query | Create new API route |
| `routes/api/users/me/savings.ts` | New | Resident savings history | Create new API route |
| `db/schema.ts` | Modified | Add `merchant_posts` table | Append new pgTable definition |
| `lib/feed.ts` | New | MV query + user transaction query; event mapping; cursor pagination | Create new lib module |
| `feed_events` MV | New | Materialized view in PostgreSQL; refresh-on-write from post/coupon handlers | Create MV via migration; add refresh calls to write handlers |
| `lib/coupon.ts` | Modified | Maybe add savings query helpers | Add `getSavingsSummary()` function |
| `lib/utils.ts` | Unmodified | No changes needed | — |
| `routes/_middleware.ts` | Unmodified | No changes needed — `ctx.state.user` already available | — |

## Testing Approach

### Unit Tests

| Module | Scenario | Key Assertions |
|---|---|---|
| `lib/feed.ts` | Empty feed returns no events | `events.length === 0`, `cursor === null` |
| `lib/feed.ts` | Feed merges events from multiple sources | Events ordered by `createdAt` desc |
| `lib/feed.ts` | Pagination with cursor returns next page | Page 2 events have `createdAt < cursor` |
| `lib/feed.ts` | Invalid cursor returns first page | Same as empty cursor |
| `islands/PassportCover.tsx` | Locked state for pending resident | Locked badge visible, QR code hidden |
| `islands/PassportCover.tsx` | Open state shows QR codes | `QRCodeDisplay` rendered for each redemption |
| `components/BottomNav.tsx` | Active tab highlighted | Correct tab has `text-primary` class |

### Integration Tests

| Scenario | Setup | Assertions |
|---|---|---|
| Feed returns global + user events | Seed merchant_posts + coupons + transactions | Response includes all types, ordered by createdAt |
| Feed works for unauthenticated user | Seed public data only | Response includes global events, no savings_notice type |
| Merchant creates post | POST /api/posts with valid business session | 201 response, MV refreshed, post visible in feed |
| Merchant creates post (unauthenticated) | POST /api/posts without session | 401 response |
| MV refresh on post creation | Seed merchant_posts, POST new post | Query MV directly — new row present after refresh |
| Resident views savings history | Seed used redemptions with transaction amounts | 200 response with correct totalSavingsCents |
| Feed pagination | Seed 25 events across 3 tables | Page 1 returns 20, page 2 returns 5 |

### Testing Dependencies

- All integration tests require the `passport_test` database with TRUNCATE between tests (existing pattern)
- Tests for `PassportCover` island require a browser-level test or Preact component testing setup (new — use `deno task test` with JSDOM or headless browser)

## Development Sequencing

### Build Order

1. **Database: add `merchant_posts` table** — Append to `db/schema.ts`, run `drizzle-kit generate`, apply migration. No dependencies.
2. **Create `feed_events` materialized view** — SQL migration that creates the MV and its unique index. Add `refreshFeedView()` helper in `lib/db.ts` or a new `lib/feed.ts`. Depends on step 1 (merchant_posts table exists).
3. **Create `lib/feed.ts`** — Feed event type definitions, MV query with cursor pagination, user transaction query, merge logic. Depends on step 2.
4. **Create feed API endpoint `routes/api/feed.ts`** — Handler that calls `lib/feed.ts` and returns paginated JSON. Depends on step 3.
5. **Rewrite `routes/index.tsx` as feed page** — Replace Fresh boilerplate with feed page handler that fetches from `/api/feed` server-side and renders event cards. Depends on step 4.
6. **Create `components/BottomNav.tsx`** — Shared bottom navigation with `active` prop. No dependencies.
7. **Update `/catalog`, `/passaporte`, `/business/[id]` to use BottomNav** — Replace inline nav with `<BottomNav>`. Depends on step 6.
8. **Create `routes/api/posts/index.ts` and `routes/api/posts/[id].ts`** — Merchant post CRUD API. Depends on step 1. Each write handler calls `refreshFeedView()`.
9. **Create merchant post publishing UI** — Business-facing form island for creating posts. Depends on step 8.
10. **Add MV refresh to coupon creation endpoint** — Existing `POST /api/coupons/[id]` (business admin) must call `refreshFeedView()` after creating a coupon. Depends on step 2.
11. **Create `PassportCover` island** — Passport cover with useSignal state machine, CSS transitions, locked/open/closed states. No dependencies.
12. **Update `routes/passaporte.tsx`** — Render `<PassportCover>` island instead of flat list; add savings history section. Depends on steps 7 and 11.
13. **Create `routes/api/users/me/savings.ts`** — Savings history query endpoint joining redemptions + transactions. No dependencies (queries existing tables only).
14. **Savings history UI** — Section within passport showing total savings and per-business breakdown. Depends on steps 12 and 13.
15. **Feed image optimization pipeline** — Auto-compress merchant-uploaded images in `lib/storage.ts` or middleware. Depends on step 8.

### Technical Dependencies

- None blocking — all infrastructure (PostgreSQL, Drizzle, Fresh, Tailwind, Better Auth) is already in place.
- Merchant image uploads reuse the existing `lib/storage.ts` and `file_metadata` table — no new storage infrastructure needed.
- The passport animation uses CSS transitions only — no new npm dependencies.

## Monitoring and Observability

| Metric | Source | Alert Threshold |
|---|---|---|
| Feed page load duration | Fresh handler timing (custom middleware) | > 500ms P95 |
| Feed query row count | Logged per request | > 1000 rows merged |
| Merchant post creation rate | Count per week | < 5 posts/week (low adoption signal) |
| Savings history query latency | Handler timing | > 200ms P95 |
| PassportCover island render count | Client-side analytics (optional) | N/A — informational |

Log events should include structured fields for the feed query: `eventCount`, `sourceTypes` (which tables contributed), `cursor`, `pageDurationMs`.

## Technical Considerations

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Feed query strategy | MV for global content + user query for transactions | Single-table pagination for 90% of content; personalization preserved |
| Feed route | Replace `/` | Cleanest URL for the primary surface |
| Bottom nav | Shared component (not island) | No client interactivity needed; reduces duplication |
| Passport animation | CSS transitions in island | Hardware-accelerated; no JS animation deps |
| Merchant posts table | New `merchant_posts` table | Simple schema; independent lifecycle from coupons |
| Savings data | Derived from `redemptions` + `transactions` | No new table; uses existing transaction data |
| Feed moderation | `isVisible` boolean gate on merchant_posts | Simple on/off toggle; manual approval in V1 |
| MV refresh strategy | Refresh-on-write from API handlers | ~500ms staleness; avoids periodic polling |

### Known Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| MV refresh contention under concurrent writes | Low | `REFRESH CONCURRENTLY` allows concurrent reads; test under load |
| MV staleness window causes user-visible delay | Low | Refresh takes ~50ms; handler calls it inline; staleness is < 500ms in practice |
| Feed query performance degrades with transaction volume | Medium | MV is a single table with index on `created_at`; monitor P95 latency |
| Merchant image uploads bloat page weight | Medium | Auto-compress images on upload; lazy-load all feed images |
| Passport animation stutters on low-end devices | Low | Use only `transform` and `opacity`; test on representative devices |
| Bottom nav extraction breaks existing page layout | Low | Visual diff each page after extraction |
| Feed feels empty before critical mass of merchants + transactions | Medium | Seed with admin announcements and coupon releases; onboard anchor merchants early |

## Architecture Decision Records

- [ADR-001: Scope and UX Decisions for V1 Resident Frontend](adrs/adr-001.md) — Replaces 3D flip animation with 2D transitions; implements hybrid social feed; enforces online validation parameters
- [ADR-002: V1 Resident Frontend Product Scope](adrs/adr-002.md) — Confirms feed-first navigation, merchant posts in V1, and full passport cover animation as the V1 scope
- [ADR-003: Feed Data Model — Union Query Approach](adrs/adr-003.md) — Superseded by ADR-005. Original union-query proposal
- [ADR-004: Feed Route, Navigation Architecture, and Passport Island](adrs/adr-004.md) — Feed replaces root route; bottom nav extracted to shared component; PassportCover island for animation states
- [ADR-005: Feed Data Model — Materialized View for Global Content with User-Specific Query](adrs/adr-005.md) — Uses materialized view for global feed content with refresh-on-write, plus separate user transaction query for personalization
