# Technical Specification: Passaporte Local

## Executive Summary

The Passaporte Local project is a mobile-first web application connecting neighborhood residents with local businesses through a coupon-based discount system. The primary technical trade-off is the use of **Deno KV** as the single database — maximizing read/write performance at the edge with zero external infrastructure, at the cost of limited query capabilities compared to a relational database. The coupon system uses per-redemption unique alphanumeric codes (with QR representations), making each discount proof single-use and non-transferable. New additions from the PRD are self-service business registration with admin feature-gating, and resident demand signals with category-based aggregation.

The stack is Deno Fresh 2 (Preact + Tailwind v4 + Vite), Better Auth with a Deno KV adapter, and local filesystem storage containerized via Docker.

## System Architecture

### Component Overview

- **Frontend (Fresh Islands):** Interactive UI components for registration, catalog, coupon redemption, passport display, business validation panel, business profile management, coupon management, and admin dashboard. Islands communicate with backend via `fetch()` calls to API routes.
- **API Routes (Fresh Route Handlers):** RESTful endpoints for users, businesses, coupons, redemptions, transactions, uploads, and admin operations. All routes behind RBAC middleware.
- **Authentication Layer (Better Auth):** Email/password authentication with session management. RBAC middleware enforces `resident`, `business`, and `admin` roles.
- **Database (Deno KV):** Single shared `Deno.openKv()` instance for all persistence — users, businesses, coupons, redemptions, transactions, demand signals, file metadata.
- **Storage Layer (Local Filesystem):** Uploaded documents and logos stored on local filesystem with KV metadata for access control. Docker volume mounts ensure persistence.
- **Business flows:**
  - **Resident:** Register → get approved → browse catalog → select coupon → redeem → get QR code → present at store
  - **Business:** Register (self-service) → set up profile → create coupons → admin enables → validate redemptions at POS
  - **Admin:** Approve residents → manage businesses (enable/disable payment gate) → view demand signals

## Implementation Design

### Core Interfaces

```go
type Coupon struct {
    ID               string  `json:"id"`
    BusinessID       string  `json:"business_id"`
    Type             string  `json:"type"` // "basic" or "special"
    Title            string  `json:"title"`
    DiscountPercent  int     `json:"discount_percent"`
    Description      string  `json:"description,omitempty"`
    GlobalLimit      *int    `json:"global_limit,omitempty"`       // null = unlimited
    GlobalClaimed    int     `json:"global_claimed_count"`
    UserMonthlyLimit *int    `json:"user_monthly_limit,omitempty"` // null = unlimited
    ValidUntil       *int64  `json:"valid_until,omitempty"`
    IsActive         bool    `json:"is_active"`
}

type Redemption struct {
    ID          string `json:"id"` // short alphanumeric code
    CouponID    string `json:"coupon_id"`
    BusinessID  string `json:"business_id"`
    UserID      string `json:"user_id"`
    Status      string `json:"status"` // active, used, expired
    RedeemedAt  int64  `json:"redeemed_at"`
    UsedAt      *int64 `json:"used_at,omitempty"`
}
```

### Data Models

**User (resident/business/admin):**
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| name | string | Full name |
| cpf | string | 11 digits, normalized |
| email | string | Unique |
| whatsapp | string | Phone with country code |
| role | string | resident / business / admin |
| status | string | pending / approved / rejected |
| documents.idPhotoUrl | string | File path |
| documents.residenceProofUrl | string | File path |
| createdAt | number | Unix timestamp |

**Business:**
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| userId | string | Owner's user ID |
| name | string | Display name |
| companyName | string | Legal name |
| cnpj | string | Normalized |
| category | string | Casa, Corpo, Alimentação, etc. |
| description | string | Free text |
| logoUrl | string | File path |
| socialLinks | object | `{ instagram?, facebook?, whatsapp?, menu? }` — menu is link to online menu/cardápio |
| openingHours | object | `{ monday?: {open, close}, ... }` — 24h format |
| isActive | boolean | Catalog visibility gate |
| createdAt | string | ISO date |

**Coupon:**
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| businessId | string | Parent business |
| type | string | basic / special |
| title | string | Display name |
| discountPercent | number | 5-30 |
| description | string | Optional |
| globalLimit | number? | null = unlimited |
| globalClaimedCount | number | Incremented atomically |
| userMonthlyLimit | number? | null = unlimited |
| validUntil | number? | Unix timestamp |
| isActive | boolean | Soft delete |

**Redemption (unique single-use code):**
| Field | Type | Notes |
|-------|------|-------|
| id | string | Alphanumeric code, e.g., "JUR-X7F9" |
| couponId | string | Source coupon |
| businessId | string | Source business |
| userId | string | Resident who redeemed |
| status | string | active / used / expired |
| redeemedAt | number | Unix timestamp |
| usedAt | number? | Unix timestamp when validated |

**Transaction:**
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| redemptionId | string | Linked redemption |
| couponId | string | Source coupon |
| businessId | string | Source business |
| userId | string | Resident |
| totalAmount | number | In cents |
| discountApplied | number | In cents |
| finalAmount | number | In cents |
| timestamp | number | Unix timestamp |

**Demand Signal (new):**
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| category | string | Mapped to catalog category |
| description | string | Free-text request |
| residentId | string | Requesting resident |
| createdAt | number | Unix timestamp |
| reviewed | boolean | Admin reviewed flag |

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/* | Better Auth handler | None |
| POST | /api/users/register | Resident registration | None |
| GET | /api/catalog | List active businesses | None |
| GET | /api/businesses/:id | Business detail | None |
| GET | /api/businesses/:id/coupons | Active coupons | None |
| POST | /api/coupons/:id/redeem | Redeem a coupon | resident |
| GET | /api/users/me/redemptions | Active redemptions | resident |
| POST | /api/businesses/register | Self-service registration (new) | None |
| PUT | /api/businesses/:id/profile | Update profile (new fields) | business |
| POST | /api/businesses/:id/coupons | Create coupon | business |
| PUT | /api/businesses/:id/coupons/:couponId | Edit coupon | business |
| DELETE | /api/businesses/:id/coupons/:couponId | Deactivate coupon | business |
| POST | /api/transactions/validate | Validate redemption | business |
| GET | /api/admin/approvals/pending | Pending residents | admin |
| POST | /api/admin/approvals/:userId | Approve/reject | admin |
| GET | /api/admin/businesses | List all businesses | admin |
| PUT | /api/admin/businesses/:id/toggle | Enable/disable | admin |
| POST | /api/signals | Create demand signal | resident |
| GET | /api/admin/signals | List signals with counts | admin |
| PUT | /api/admin/signals/:id/review | Mark reviewed | admin |
| GET | /api/uploads/:filename | Serve files | Mixed |

**KV key structure:**
- `["user", "<id>"]` — User record
- `["users_by_cpf", "<cpf>"]` — CPF index → user ID
- `["business", "<id>"]` — Business record
- `["businesses_by_category", "<category>"]` — Category index
- `["coupon", "<businessId>", "<couponId>"]` — Coupon record
- `["redemption", "<code>"]` — Redemption lookup by code
- `["user_redemptions", "<userId>", "<timestamp>"]` — User's redemptions
- `["transaction", "<id>"]` — Transaction record
- `["transactions_by_business", "<businessId>", "<timestamp>"]` — Business transactions
- `["signal", "<id>"]` — Demand signal (new)
- `["signals_by_category", "<category>", "<timestamp>"]` — Category index (new)
- `["signal_counts", "<category>"]` — Aggregated count (new)

## Integration Points

None in V1. No external payment gateway, no email service, no SMS provider. All integrations are deferred to Phase 2+ (email notifications for approval, push notifications, automated document verification SDK).

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|-----------|-------------|---------------------|-----------------|
| `lib/business.ts` | Modified | Add socialLinks (instagram, facebook, whatsapp, menu), openingHours fields, CNPJ validation for self-service | Extend Business interface, add field validators |
| `routes/api/businesses/register.ts` | New | Self-service registration endpoint | Implement with pending status |
| `routes/api/businesses/[id]/profile.ts` | New | Profile update endpoint for business owners | Implement with ownership check |
| `routes/api/admin/businesses/toggle.ts` | New | Business enable/disable toggle | Simple KV update |
| `routes/api/signals/index.ts` | New | POST to create signal | Implement with category indexing |
| `routes/api/admin/signals/index.ts` | New | GET signals with counts | Aggregate from KV indexes |
| `routes/api/catalog.ts` | Modified | Filter by isActive | Add query filter |
| `islands/BusinessManager.tsx` | Modified | Add profile editor fields | Add social, hours, menu UI |
| `islands/CouponManager.tsx` | Existing | No changes needed | — |
| `islands/ApprovalDashboard.tsx` | Modified | Add signal viewer tab | New component tab |
| `routes/_middleware.ts` | Modified | Allow public catalog browse | Already in place |

## Testing Approach

### Unit Tests

- **Business registration validation:** Missing fields, invalid CNPJ, duplicate email/CNPJ
- **Business profile update:** Field length validation, ownership check, inactive business rejected
- **Demand signal creation:** Category validation, empty description, duplicate detection
- **Coupon redemption limits:** Global cap race condition (atomic check), monthly per-user cap, expired coupon
- **Transaction validation:** Used code, expired code, wrong business, discount calculation math

### Integration Tests

- **Full business flow:** Register business → admin enables → create coupon → resident redeems → cashier validates → transaction recorded
- **Demand signal flow:** Create signal → admin views with counts → mark reviewed → counts decrement
- **RBAC enforcement:** Business cannot access admin endpoints, resident cannot create coupons, unauthenticated cannot redeem

Use in-memory KV (`:memory:`) for isolation and `stub()` for session mocking, following the existing test patterns.

## Development Sequencing

### Build Order

1. **Extend Business data model and validation** — Add socialLinks (instagram, facebook, whatsapp, menu) and openingHours fields to the Business interface. Extend CNPJ and field validation in `lib/business.ts`. No dependencies.
2. **Self-service business registration endpoint** — `POST /api/businesses/register`. Creates user account with role=business and business record with isActive=false. Depends on step 1.
3. **Business profile management API** — `PUT /api/businesses/[id]/profile`. Ownership check, field validation, KV update. Depends on step 2.
4. **Business enable/disable admin endpoint** — `PUT /api/admin/businesses/[id]/toggle`. Admin-only, toggles isActive. Depends on step 2.
5. **Catalog filter by isActive** — Modify catalog query to filter businesses with `isActive: true`. Depends on step 4.
6. **Business dashboard UI — profile editor** — Add social media, hours, menu link fields to BusinessManager island. Show activation status banner. Depends on step 3.
7. **Resident demand signals backend** — `POST /api/signals`, `GET /api/admin/signals`, `PUT /api/admin/signals/[id]/review`. KV key structure with category index and atomic count updates. No dependencies.
8. **Demand signal frontend** — "Request a service" button on catalog page + admin signal viewer tab in ApprovalDashboard island. Depends on step 7.
9. **Tests for new flows** — Unit + integration tests for self-service registration, profile management, enable/disable, demand signals. Depends on steps 1-8.

### Technical Dependencies

- No external dependencies — all changes operate within the existing Deno KV + Fresh stack.
- Self-service registration reuses the existing user creation pattern from `routes/api/users/register.ts`.

## Monitoring and Observability

- **KPI tracking logs:** Log coupon redemption attempts (success/failure with reason), transaction validations, and business registration events with structured fields
- **Error logging:** Validation failures (duplicate CPF, invalid CNPJ, expired coupon) logged at WARN level
- **Admin signal count:** Track aggregate signal counts per category as a product health metric
- **No external monitoring in V1** — relies on Docker container logs and manual admin review

## Technical Considerations

### Key Decisions

- **Decision:** Deno KV for demand signal storage with category indexes
  - **Rationale:** No additional infrastructure, atomic count operations, sufficient for V1 scale
  - **Trade-offs:** Manual pagination needed for large signal lists
- **Decision:** Immediate business access with catalog feature-gating
  - **Rationale:** Businesses can prepare content while payment is processed, admin toggle is simple
  - **Trade-offs:** Business dashboard needs activation state UI
- **Decision:** Opening hours as structured JSON object (not free text)
  - **Rationale:** Enables future features (filter by open now, consistent display formatting)
  - **Trade-offs:** More complex validation on input, potential for partial data if businesses skip days

### Known Risks

- **Race conditions on coupon limits:** Multiple residents redeeming the last available special coupon simultaneously. Mitigation: use `kv.atomic()` compare-and-set for `globalClaimedCount` — already implemented in the existing codebase.
- **Business profile quality:** Self-registered businesses may submit incomplete or unprofessional profiles. Mitigation: require minimum fields (logo, description, category) before profile is publicly visible, provide examples during onboarding.
- **Signal spam:** A single resident could submit many duplicate requests. Mitigation: rate-limit to 5 signals per resident per day, deduplicate by similar description text.

## Architecture Decision Records

- [ADR-001: Single-Neighborhood Pilot Before Multi-Neighborhood Expansion](adrs/adr-001.md) — Launch V1 in one dense neighborhood. Prove retention loop before expanding horizontally.
- [ADR-002: Self-Service Business Registration with Admin Payment Gate](adrs/adr-002.md) — Businesses register and manage their own profiles and coupons. Admin enables/disables based on payment status.
- [ADR-003: Resident Demand Signals Storage and Notification](adrs/adr-003.md) — KV with category index, count aggregation, and admin badge for new signals.
- [ADR-004: Immediate Business Access with Feature Gating During Activation](adrs/adr-004.md) — Businesses can prepare profile and coupons before admin enables catalog visibility.
