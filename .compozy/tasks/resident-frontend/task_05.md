---
status: completed
title: 'Merchant post API + publishing UI'
type: backend
complexity: medium
dependencies:
    - task_01
---

# Task 05: Merchant post API + publishing UI

## Overview

Create the merchant post CRUD API endpoints and a simple business-facing publishing UI. This enables verified business accounts to publish text + image announcements to the resident feed, driving engagement and giving merchants a direct marketing channel.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `POST /api/posts` for creating a merchant post (title, body, optional image)
- MUST create `GET /api/posts` for listing the authenticated business's own posts
- MUST create `PUT /api/posts/[id]` for updating own post
- MUST create `DELETE /api/posts/[id]` for deleting own post
- MUST enforce business-role authentication on all endpoints
- MUST set `isVisible=false` by default (moderation gate)
- MUST call `refreshFeedView()` after creating or updating a post
- MUST create a business-facing publishing form island for creating posts
- MUST validate image uploads (type, size) and reuse existing `lib/storage.ts`
</requirements>

## Subtasks

- [ ] 05.1 Create `routes/api/posts/index.ts` with POST and GET handlers
- [ ] 05.2 Create `routes/api/posts/[id].ts` with PUT and DELETE handlers
- [ ] 05.3 Implement auth checks (business role) and input validation
- [ ] 05.4 Add `refreshFeedView()` calls after write operations
- [ ] 05.5 Create merchant post publishing UI island
- [ ] 05.6 Write tests for API and UI

## Implementation Details

See TechSpec "API Endpoints" section for the post API contracts. Follow the existing Fresh API pattern from `routes/api/businesses/register.ts` or `routes/api/coupons/[id]/redeem.ts`.

Posts are set to `isVisible=false` by default. An admin approval mechanism or an explicit publish action can be added later. For V1, an admin can flip `isVisible` directly in the database.

The publishing UI island should be a simple form with a text title, text body, and optional image upload. It lives alongside the existing business UI islands.

### Relevant Files

- `routes/api/posts/index.ts` — New: POST + GET handlers
- `routes/api/posts/[id].ts` — New: PUT + DELETE handlers
- `islands/MerchantPostForm.tsx` — New: publishing form island
- `lib/storage.ts` — Reuse for image uploads
- `lib/feed.ts` — `refreshFeedView()` function
- `db/schema.ts` — merchant_posts table (created in task_01)
- `routes/api/businesses/index.ts` — Reference for auth patterns

### Dependent Files

- `routes/api/feed.ts` — Feed reads merchant posts from MV (task_02)

### Related ADRs

- [ADR-005: Feed Data Model — Materialized View for Global Content with User-Specific Query](../adrs/adr-005.md) — MV refresh triggered by post creation

## Deliverables

- Merchant post CRUD API endpoints
- Publishing form island
- Integration tests for all endpoints
- Test coverage >=80%

## Tests

- Unit tests:
  - [ ] Post input validation rejects empty title, oversized body, invalid image type
- Integration tests:
  - [ ] `POST /api/posts` with valid business session returns 201 and creates post
  - [ ] `POST /api/posts` without authentication returns 401
  - [ ] `POST /api/posts` with resident role returns 403
  - [ ] `GET /api/posts` returns list of authenticated business's posts
  - [ ] `PUT /api/posts/[id]` updates own post, returns updated post
  - [ ] `PUT /api/posts/[id]` for another business's post returns 403
  - [ ] `DELETE /api/posts/[id]` deletes own post, returns 200
  - [ ] After POST, MV refresh is triggered and post appears in feed
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Businesses can create, list, update, and delete posts
- Posts appear in the feed after creation (via MV refresh)
- Posts are not publicly visible until `isVisible=true`
