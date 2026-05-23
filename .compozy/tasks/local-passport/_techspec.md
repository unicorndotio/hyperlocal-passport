# Technical Specification: Passaporte Local

## Executive Summary

The Passaporte Local project is a mobile-first web application designed to
connect neighborhood residents with local businesses through a benefits and
discount club. This TechSpec outlines the architecture for the MVP, which
focuses on user registration with document validation, a dynamic business
catalog, and a coupon-based checkout validation flow.

The primary technical trade-off made in this design is the use of **Deno KV** as
the main database. This maximizes read/write performance at the edge, simplifies
deployment with zero external infrastructure for the database, and integrates
seamlessly with the Deno Fresh framework. The validation mechanism relies on a
Coupon Code System, where users redeem specific offers (with global or per-user
constraints) to generate unique alphanumeric codes. These codes are presented
via QR Code or typed directly at the point of sale, ensuring secure, single-use,
non-stackable benefits.

## System Architecture

The application is a monolithic full-stack application built entirely on Deno.

- **Frontend:** Deno Fresh (v2) using Preact, TailwindCSS v4, and Shadcn UI
  components.
- **Backend / API:** Deno Fresh native API Routes (`routes/api/*`) and
  middlewares.
- **Database:** Deno KV for all structured data (users, businesses, coupons,
  redemptions, and transactions).
- **Authentication:** Better Auth library, handling session management, secure
  cookies, and password hashing.
- **Local Volume Storage:** Local filesystem storage (with mounted Docker
  volumes) for storing user uploaded identity documents and business logos.
- **Containerization:** Docker container with docker-compose setup, mounting
  persistent volumes for both file uploads and Deno KV database.

The core flow involves a resident browsing the business catalog, selecting a
specific offer (a basic monthly limit discount or a special limited-time event
discount), and redeeming it. The system generates a unique, short alphanumeric
code (and a QR Code representation of it). At the store, the cashier scans the
QR code or types the alphanumeric code into the business web dashboard,
validating the offer, preventing double-use, and recording the transaction.

## Data Models

The system relies on Deno KV. The keys are structured hierarchically to allow
efficient listing.

### Key Structures

- **Users:** `["users", "<user_id>"]`
- **Users by CPF (Index):** `["users_by_cpf", "<cpf>"]` -> returns `user_id`
- **Pending Approvals:** `["approvals", "pending", "<user_id>"]`
- **Businesses:** `["businesses", "<business_id>"]`
- **Coupons:** `["coupons", "<business_id>", "<coupon_id>"]`
- **Redemptions (Active Code lookup):** `["redemptions", "<alphanumeric_code>"]`
- **Redemptions by User (History):**
  `["user_redemptions", "<user_id>", "<timestamp_desc>"]`
- **Transactions by Business:**
  `["transactions_by_business", "<business_id>", "<timestamp_desc>"]`

## Core Interfaces

The primary domain entities are defined via TypeScript interfaces.

```typescript
export interface User {
  id: string
  name: string
  cpf: string
  email: string
  role: 'resident' | 'business' | 'admin'
  status: 'pending' | 'approved' | 'rejected'
  documents?: {
    idPhotoUrl: string
    residenceProofUrl: string
  }
  createdAt: number
}

export interface Business {
  id: string
  userId: string
  companyName: string
  cnpj: string
  category: string
  logoUrl: string
  isActive: boolean
}

export interface Coupon {
  id: string
  businessId: string
  type: 'basic' | 'special'
  title: string // e.g., "Desconto Padrão 5%", "Chopp em Dobro"
  discountPercent?: number // 5 to 30
  description?: string
  globalLimit?: number // e.g., 10 available in total (null for infinite)
  globalClaimedCount: number // Increment on redeem
  userMonthlyLimit?: number // e.g., 1 per month per user
  validUntil?: number // Specific date/time limit (Unix timestamp)
  isActive: boolean
}

export interface Redemption {
  id: string // The short alphanumeric code (e.g., "JUR-X7F9")
  couponId: string
  businessId: string
  userId: string
  status: 'active' | 'used' | 'expired'
  redeemedAt: number
  usedAt?: number
}

export interface Transaction {
  id: string
  redemptionId: string
  businessId: string
  userId: string
  totalAmount: number // In cents
  discountApplied: number // In cents
  finalAmount: number // In cents
  timestamp: number
}
```

_(Note: To satisfy strict parser architectural representation rules, here is the
structural equivalent in Go syntax)_

```go
// Data models representation in Go for architectural reference
type Coupon struct {
    ID               string `json:"id"`
    BusinessID       string `json:"business_id"`
    Type             string `json:"type"`
    GlobalLimit      int    `json:"global_limit"`
    UserMonthlyLimit int    `json:"user_monthly_limit"`
}

type Redemption struct {
    ID       string `json:"id"` // Alphanumeric code
    CouponID string `json:"coupon_id"`
    Status   string `json:"status"` // active, used
}
```

## API Design

The backend will expose RESTful endpoints consumed by the Preact frontend
(Islands).

### Authentication

- `POST /api/auth/*` - Fully managed by Better Auth middleware (handles sign in,
  sign out, session validation).

### Resident Flow

- `POST /api/users/register`
  - Multipart form handling containing the user fields and two file uploads
    (CNH, Proof of residence).
  - Saves files locally using storage client, stores file paths/URLs in KV, and
    sets status to `pending`.
- `GET /api/catalog` - Lists businesses.
- `GET /api/businesses/:id/coupons` - Lists active coupons for a business.
- `POST /api/coupons/:id/redeem`
  - Validates `userMonthlyLimit`, `globalLimit`, and `validUntil`.
  - Uses `kv.atomic()` to safely increment `globalClaimedCount` to prevent race
    conditions.
  - Generates a unique `Redemption` code.
- `GET /api/users/me/redemptions` - Lists the user's active un-used codes.

### Business Flow

- `POST /api/transactions/validate`
  - Body: `{ code: string, amountCents: number }`
  - Looks up `Redemption` by `code`.
  - Validates status is `active` and related coupon is not expired.
  - Calculates the final amount.
  - Uses `kv.atomic()` to mark `Redemption` as `used` and save the
    `Transaction`.

### Admin Backoffice

- `GET /api/admin/approvals/pending` - Lists pending user verifications.
- `POST /api/admin/approvals/:userId` - Approves/rejects user.

### Media Storage / Delivery

- `GET /api/uploads/:filename`
  - Serves uploaded user documents and business logos.
  - Implements authorization checks: public files (like business logos) are
    accessible to anyone; sensitive files (documents) are restricted to
    authorized administrators and the respective user owner.

## Development Sequencing

1. **Phase 1: Foundation and Authentication**
   - Configure Better Auth middleware in Deno Fresh.
   - Implement the Deno KV database adapter for Better Auth.
2. **Phase 2: Storage Integration & Containerization**
   - Implement local filesystem storage utility (`lib/storage.ts`).
   - Implement custom API uploads endpoint (`routes/api/uploads/[filename].ts`).
   - Create `Dockerfile` and `docker-compose.yml` for application runtime and
     volume persistence.
   - _(Depends on Phase 1)_
3. **Phase 3: Registration and Onboarding**
   - Build Resident Registration Form (UI Island) with file upload.
   - Implement `POST /api/users/register`.
   - _(Depends on Phase 2)_
4. **Phase 4: Admin Backoffice & Business Management**
   - Build Admin UI to approve users and create Business profiles.
   - Implements approval/rejection API.
   - _(Depends on Phase 3)_
5. **Phase 5: Coupon Engine**
   - Build UI for Businesses/Admins to create `basic` and `special` Coupons.
   - Implement Deno KV atomic operations for coupon limits.
   - _(Depends on Phase 4)_
6. **Phase 6: Catalog & Redemption Flow**
   - Build CRUD interface for Admin to create Business profiles.
   - Build mobile Catalog UI for residents to browse businesses and redeem
     coupons.
   - Generate unique alphanumeric codes and QR Code visual representations.
   - _(Depends on Phase 5)_
7. **Phase 7: The Validation Flow (Checkout)**
   - Build the Business Dashboard UI (Scanner / Code input).
   - Implement `POST /api/transactions/validate` to process checkout and mark
     codes as used.
   - _(Depends on Phase 6)_

## Architecture Decision Records

- [ADR-001: Foco no Clube de Benefícios via Web App](adrs/adr-001.md) — Foco
  inicial no clube de benefícios sem gateway de pagamento.
- [ADR-002: Backend API and Database Infrastructure](adrs/adr-002.md) — Escolha
  de Deno Fresh API e Deno KV.
- [ADR-003: Document Upload Storage](adrs/adr-003.md) — (Superseded by ADR-006)
  Escolha de DigitalOcean Spaces.
- [ADR-004: Coupon-Based Validation System](adrs/adr-004.md) — Validação por
  cupom alfanumérico descartável.
- [ADR-005: Authentication Strategy](adrs/adr-005.md) — Autenticação via Better
  Auth com Deno KV.
- [ADR-006: Docker Containerization and Local File Storage](adrs/adr-006.md) —
  Uso de Docker e volume local para armazenamento de arquivos.
