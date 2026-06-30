# Passaporte Local

A mobile-first web application that connects neighborhood residents with local businesses through a discount and benefits club. Residents get exclusive savings (5–30%) at nearby shops, restaurants, and service providers by redeeming a coupon and showing it at checkout. Businesses pay a flat monthly subscription to be listed and gain access to hyperlocal customers they cannot reach through generic advertising.

**Initial launch neighborhood:** Jurerê Internacional, Florianópolis, SC, Brasil.

## Problem

Residents spend outside their neighborhood not out of preference, but because they have no visibility into what local businesses offer and no incentive to choose them. Local businesses cannot afford iFood's 12–27% commissions or escalating digital ad costs, even though their best customers live within 2km.

## Solution

A closed-loop neighborhood benefits platform:
- Residents register with proof of residency, get approved within 24h, and use their digital passport (QR code) to claim discounts at the physical point of sale.
- Businesses are listed with their discount offer and validate resident purchases via a lightweight web dashboard — no new POS hardware required.
- Admins manage the approval queue and business catalog through a backoffice.

## Architecture at a Glance

| Layer | Technology |
|-------|-----------|
| Framework | Deno Fresh 2 (Preact + TailwindCSS 4) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Auth | Better Auth (Drizzle adapter) |
| Image Processing | `sharp` via npm |
| Storage | Local filesystem (Docker volume) |
| Containerization | Docker + Docker Compose |

## User Roles

| Role | What they do |
|------|-------------|
| **Resident** | Registers with documents → gets approved → views hybrid feed & catalog → redeems coupons → shows QR at passport card checkout |
| **Business** | Publishes posts → cashier validates resident QR/CPF → checkout calculator applies discount |
| **Admin** | Approves/rejects resident registrations → manages business catalog (CRUD) |

## Running the Project

```bash
# Development
deno task dev

# Production
docker compose up -d --build
# App available at http://localhost:8000
```

Environment variables required: `PG_CONNECTION`, `BETTER_AUTH_SECRET`, `APP_BASE_URL`, `BETTER_AUTH_URL`.

## Status

Resident Frontend V1 and Core Database Migration completed (June 2026). The app now features a hybrid resident home feed (merchant posts + system events + personal savings), a persistent bottom navigation system, a premium Bento-style digital passport with hardware-accelerated transitions, and server-side image compression. All features are live, tested, and audited.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — System design, data models, API surface
- [`docs/features.md`](docs/features.md) — Feature inventory across all workflows
- [`docs/workflows.md`](docs/workflows.md) — Completed workflow history and decisions
- [`AGENTS.md`](AGENTS.md) — AI agent and Copilot context
