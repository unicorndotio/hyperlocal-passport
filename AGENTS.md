# AGENTS.md — Passaporte Local

AI agent and Copilot context for all coding workflows. Read this before starting any task.

---

## Project in One Sentence

Passaporte Local is a mobile-first Deno Fresh 2 web app where neighborhood residents claim discounts at local businesses by redeeming coupons and showing a QR-code digital passport at the physical point of sale.

---

## Build, Test & Lint Commands

```bash
# Development
deno task dev           # Hot-reload dev server

# Production
deno task build         # Vite production build
deno task start         # Start production server

# Testing
deno task test          # All tests
deno task test -- tests/auth.test.ts  # Single file
deno task test:cov      # With coverage
deno coverage cov_profile/            # Coverage summary

# Code quality
deno task check         # Format + lint + type-check (run before committing)
deno task lint
deno task type-check
deno task fmt

# Database
docker compose exec web deno run -A seed.ts   # Seed the database
```

---

## Stack

| Concern | Library / Tool |
|---------|---------------|
| Runtime | Deno |
| Framework | Fresh 2 (file-based routing) |
| UI | Preact (not React) |
| Styling | TailwindCSS 4 + `@tailwindcss/vite` |
| Components | Radix UI primitives + Bento design system |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Better Auth with Drizzle adapter |
| Build | Vite |
| Container | Docker + Docker Compose |

---

## Directory Structure

```
routes/               # File-based routing (Fresh convention)
  api/                # REST endpoints
  _app.tsx            # HTML shell
  _middleware.ts      # Auth/session injection
components/
  ui/                 # Design system components (Button, Card, Input, Badge…)
islands/              # Client-side interactive Preact components
lib/                  # Business logic & utilities
  auth.ts             # Better Auth config
  db.ts               # Drizzle client singleton
  business.ts         # Business feature logic
  coupon*.ts          # Coupon engine logic
  analytics.ts        # Analytics helpers
  signals.ts          # Preact signals (reactive state)
  storage.ts          # File storage abstraction
db/
  schema.ts           # Drizzle schema (source of truth for data model)
  migrations/         # Auto-generated SQL migration files
tests/                # Deno-native test files (*.test.ts)
static/               # Static assets
utils.ts              # define.page() / define.route() typed helpers
```

---

## Key Conventions

### Code Style
- **No semicolons** (enforced via `deno.json`)
- **Single quotes** (enforced via `deno.json`)
- **Preact, not React** — import from `preact`; JSX mode is `precompile`
- **TypeScript everywhere**

### Fresh Routing Pattern
```ts
// Page
export default define.page<PageProps>(({ state }) => { ... })

// API route
export const handler = define.route({
  async GET(req, ctx) { ... },
  async POST(req, ctx) { ... },
})
```
Access the current user via `ctx.state.user`.

### Database (Drizzle + PostgreSQL)
- Schema lives in `db/schema.ts` — **always edit schema here first**
- After schema changes: `drizzle-kit generate` → review migration in `db/migrations/` → apply
- Use the shared client from `lib/db.ts` — never create a new client instance
- Connection string via env var `PG_CONNECTION`

### Authentication (Better Auth)
- Config in `lib/auth.ts`
- Sessions stored in PostgreSQL via Drizzle adapter
- User model fields: `id`, `email`, `name`, `role` (`resident` | `business` | `admin`), `status` (`pending` | `approved` | `rejected`)
- All auth routes handled by Better Auth middleware at `POST /api/auth/*`

### File Uploads
- Files stored in local filesystem, persisted via Docker volume
- Served via `GET /api/uploads/:filename`
- Public files (business logos): accessible to anyone
- Sensitive files (resident documents): restricted to admin and owning resident

---

## Data Model Summary

All entities are in PostgreSQL via Drizzle. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | All user accounts (residents, businesses, admins) |
| `businesses` | Business profiles linked to a user |
| `coupons` | Coupon offers created by businesses |
| `redemptions` | Active codes generated when a resident redeems a coupon |
| `transactions` | Completed checkouts recorded by the business cashier |
| `file_metadata` | Metadata for uploaded documents and logos |

Coupon behavior is stored as a discriminated union (`behavior` field) supporting: `percentage_discount`, `fixed_amount`, `buy_x_get_y`, `item_specific`.

---

## API Surface

### Auth
`POST /api/auth/*` — managed by Better Auth middleware

### Resident
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/register` | Multipart form with document uploads; sets status `pending` |
| GET | `/api/catalog` | List active businesses |
| GET | `/api/businesses/:id/coupons` | Active coupons for a business |
| POST | `/api/coupons/:id/redeem` | Generate a unique redemption code |
| GET | `/api/users/me/redemptions` | Resident's active (unused) codes |

### Business / Cashier
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/validate` | Body: `{ code, amountCents }` — validates and records the sale |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/approvals/pending` | Pending resident verifications |
| POST | `/api/admin/approvals/:userId` | Approve or reject a resident |

---

## Design System (Bento)

See `DESIGN.md` for full token reference.

| Token | Value |
|-------|-------|
| Primary | `#FAD4C0` |
| Secondary | `#80A1C1` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Danger | `#DC2626` |
| Surface | `#FFF5E6` |
| Font (body) | Inter |
| Font (code/labels) | JetBrains Mono |
| Spacing scale | 4 / 8 / 12 / 16 / 24 / 32 px |

Accessibility: WCAG 2.2 AA, keyboard-first, visible focus states.

---

## Testing Conventions

- Framework: `Deno.test()` with `std/assert`
- Tests use a dedicated `passport_test` database
- Each test file runs `TRUNCATE` cleanup before/after
- File naming: `tests/<feature>.test.ts`
- Coverage: `deno task test:cov` → `deno coverage cov_profile/`

---

## What Is Out of Scope (Do Not Implement Unless Specified)

- Payment gateway / marketplace / e-commerce
- Cashback or points accumulation (Beach Pay-style)
- Community classifieds, lost-and-found, "Anuncie Aqui"
- Mobile push notifications (Phase 2)
- Multi-neighborhood admin tools (Phase 2)
- Automated document verification SDK (Phase 2)
- Self-service business onboarding (Phase 2)
- Coupon stacking (Phase 2)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PG_CONNECTION` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secure random string for session signing |
| `APP_BASE_URL` | Public base URL of the app |
| `BETTER_AUTH_URL` | Better Auth internal URL (usually same as APP_BASE_URL) |

---

## Common Workflow Recipes

**Add a new page:**
1. Create `routes/my-page.tsx`
2. Export `export default define.page(...)` 
3. Access user via `props.state.user`

**Add a new API endpoint:**
1. Create `routes/api/my-resource/index.ts`
2. Export `export const handler = define.route({ GET, POST, ... })`
3. Add RBAC check against `ctx.state.user.role`

**Add a database table:**
1. Edit `db/schema.ts`
2. Run `drizzle-kit generate`
3. Review and apply migration
4. Add query helpers in `lib/`

**Run a quick seed:**
```bash
docker compose exec web deno run -A seed.ts
```