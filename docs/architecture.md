# Architecture — Passaporte Local

## System Overview

Passaporte Local is a **monolithic full-stack application** running on Deno with Fresh 2. There are no separate microservices. The backend (API routes) and frontend (SSR pages + client islands) live in the same codebase and deploy as a single Docker container.

```
Browser (Mobile / Desktop)
        │
        ▼
  Fresh 2 Router (Deno)
  ┌─────────────────────────────────┐
  │  _middleware.ts                 │  ← injects session/user into ctx.state
  │  routes/                        │  ← SSR pages (.tsx)
  │  routes/api/                    │  ← REST JSON endpoints
  │  islands/                       │  ← client-side interactive components
  └────────────┬────────────────────┘
               │
       ┌───────┴────────┐
       │  Drizzle ORM   │
       └───────┬────────┘
               │
       ┌───────┴────────┐
       │  PostgreSQL    │  ← sessions, users, businesses, coupons, transactions
       └────────────────┘

  Docker Volume → /uploads   ← resident documents, business logos
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL via Drizzle ORM | Migrated from Deno KV in `db-migration` workflow; relational model scales better for complex queries |
| Auth | Better Auth + Drizzle adapter | Session stored in PostgreSQL; handles cookies, password hashing, RBAC |
| File storage | Local filesystem + Docker volume | No external object storage dependency for MVP; mount path `/uploads` |
| Frontend | Preact SSR + Islands | Fresh's island architecture minimises JS sent to client; most pages are pure SSR |
| No payment gateway | External billing | Subscriptions invoiced manually; marketplace is Phase 3 |
| Single neighborhood | Jurerê first | Depth before breadth; prove retention loop before expanding |

Original tech spec used Deno KV as the database. The `db-migration` workflow fully migrated all routes, page handlers, and tests to PostgreSQL + Drizzle.

---

## Data Model

Schema source of truth: `db/schema.ts`.

### `users`
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| name | string | |
| email | string | unique |
| cpf | string | unique index |
| role | enum | `resident` \| `business` \| `admin` |
| status | enum | `pending` \| `approved` \| `rejected` |
| createdAt | timestamp | |

### `businesses`
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| userId | string | FK → users |
| companyName | string | |
| cnpj | string | |
| category | string | e.g. `casa`, `corpo`, `alimentacao`, `esporte` |
| logoUrl | string | path served via `/api/uploads/:filename` |
| isActive | boolean | controls catalog visibility |
| openingHours | jsonb | nullable per-day entries |

### `coupons`
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| businessId | string | FK → businesses |
| type | enum | `basic` \| `special` |
| title | string | display name |
| behavior | jsonb | discriminated union (see below) |
| restrictions | jsonb | composable restriction set |
| globalLimit | int | null = infinite |
| globalClaimedCount | int | incremented atomically on redeem |
| userMonthlyLimit | int | per-user monthly cap |
| validUntil | timestamp | nullable expiry |
| isActive | boolean | |

**Coupon behavior discriminated union:**
```ts
type CouponBehavior =
  | { type: 'percentage_discount'; percent: number }
  | { type: 'fixed_amount'; amountCents: number }
  | { type: 'buy_x_get_y'; buyQty: number; getQty: number; scope: string }
  | { type: 'item_specific'; discountCents: number; itemName: string }
```

### `redemptions`
| Field | Type | Notes |
|-------|------|-------|
| id | string | short alphanumeric code, e.g. `JUR-X7F9` |
| couponId | string | FK → coupons |
| businessId | string | FK → businesses |
| userId | string | FK → users |
| status | enum | `active` \| `used` \| `expired` |
| redeemedAt | timestamp | when the resident generated the code |
| usedAt | timestamp | when the cashier validated it |

### `transactions`
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| redemptionId | string | FK → redemptions |
| businessId | string | FK → businesses |
| userId | string | FK → users |
| totalAmount | int | in cents |
| discountApplied | int | in cents |
| finalAmount | int | in cents |
| timestamp | timestamp | |

### `file_metadata`
Tracks uploaded files (resident documents, business logos). Actual bytes on disk at Docker volume mount.

### `merchant_posts`
| Field | Type | Notes |
|-------|------|-------|
| id | string (uuid) | PK |
| businessId | string | FK → businesses |
| title | string | Max 255 chars |
| body | string | |
| imageUrl | string | Optional uploaded post image |
| isVisible | boolean | Moderation status |
| createdAt | timestamp | |
| updatedAt | timestamp | |

---

## Request Lifecycle

1. Browser sends request to Deno process
2. `routes/_middleware.ts` reads session cookie → fetches user from PostgreSQL via Better Auth + Drizzle → injects into `ctx.state.user`
3. Fresh router dispatches to the matching `routes/*.tsx` (SSR page) or `routes/api/*.ts` (JSON handler)
4. API handlers enforce RBAC by checking `ctx.state.user.role`
5. Business logic in `lib/` executes Drizzle queries against PostgreSQL
6. SSR pages render Preact components server-side; islands hydrate on client

---

## RBAC

Three roles enforced at middleware + API handler level:

| Role | Access |
|------|--------|
| `resident` | Catalog, own profile, coupon redemption, own passport, hybrid feed |
| `business` | Validation panel, own business profile, own coupons, post publishing |
| `admin` | Approval queue, full business CRUD, user management |

Ownership validation is enforced at the API level (e.g., a business user can only manage their own coupons, transactions, and posts).

---

## File Storage

- Upload endpoint: `POST /api/uploads` (multipart form)
- Serve endpoint: `GET /api/uploads/:filename`
- Authorization: logos and feed images are public; resident documents restricted to owner + admin
- Volume mount: `./uploads:/app/uploads` in `docker-compose.yml`

---

## Coupon & Redemption Flow

```
Resident opens catalog
  → selects business
    → selects coupon
      → POST /api/coupons/:id/redeem
        → validate userMonthlyLimit, globalLimit, validUntil
          → atomic increment of globalClaimedCount
            → generate unique alphanumeric code (e.g. JUR-X7F9)
              → store Redemption with status=active
                → render QR code on resident's screen

Cashier scans QR or types code
  → POST /api/transactions/validate { code, amountCents }
    → look up Redemption by code
      → validate status=active, coupon not expired
        → dispatch checkout calculator by behavior type
          → atomic: mark Redemption as used + save Transaction
            → return { discountApplied, finalAmount } to cashier UI
```

---

## Hybrid Feed & Materialized View Flow

The Resident Home Feed mixes global posts/events with user-specific savings notifications:

1. **Global Events & Merchant Posts**:
   Aggregated via a PostgreSQL Materialized View `feed_events`. The view compiles:
   - System events (e.g. coupon release announcements)
   - Verified merchant-authored posts (`merchant_posts` where `is_visible` is true)
   This view is refreshed concurrently (`REFRESH MATERIALIZED VIEW CONCURRENTLY feed_events`) on coupon or merchant post creation/updates to ensure high read performance.
   
2. **User Savings notices**:
   Queried dynamically at request time to show personalized transaction notifications ("Você economizou R$ XX na Padaria").
   
3. **Query Engine**:
   - `queryFeed(db, userId, cursor, limit)` queries global records from `feed_events` matching the pagination cursor.
   - If a resident `userId` is active, it queries recent personal transactions from the database.
   - Merges and sorts both sets by timestamp, returning a paginated list of feed events.

---

## Image Optimization Pipeline

For merchant post uploads, images are compressed and optimized on the backend:
- **Library**: `sharp` via npm.
- **Constraints**: Max 5MB upload size.
- **Processing**: Uploaded images are resized to maximum width and compressed to reduce mobile bandwidth usage.

---

## Deployment

```bash
docker compose up -d --build
```

- App: `http://localhost:8000`
- PostgreSQL: internal container, volume-persisted
- Uploads: volume-persisted at `./uploads`

Multi-stage Docker build: Deno image, Vite build output in `_fresh/`, static files served by Fresh's `staticFiles()` middleware.