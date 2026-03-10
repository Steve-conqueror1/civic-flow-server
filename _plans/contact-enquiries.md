# Plan: Contact Enquiries Module

## Context
Citizens need a public API to submit enquiries. Submissions require Cloudflare Turnstile bot protection, per-IP rate limiting, and a confirmation email. Admins need endpoints to list all enquiries and update their statuses.

The `contact_messages` table and `contactMessageStatusEnum` (values: `new`, `read`, `replied`, `archived`) are already defined in `src/modules/contact/contact.schema.ts` and re-exported from `src/db/index.ts`. A pending migration (`drizzle/0012_tired_mad_thinker.sql`) already exists — it just needs to be applied. Only the application layer (router, controller, service, repository, zod schemas) remains to be built.

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/contact` | None | Submit enquiry (rate limited + Turnstile) |
| GET | `/api/v1/contact` | admin / super_admin | List all enquiries |
| PATCH | `/api/v1/contact/:id/status` | admin / super_admin | Update enquiry status |

> Note: The spec says `/api/contact` for the public endpoint, but `/api/v1/contact` is used here for consistency with the rest of the API.

---

## Implementation Steps

### 1. Install `express-rate-limit`
```bash
npm install express-rate-limit
```
(Built-in types since v6 — no separate `@types` package needed.)

### 2. Apply the pending migration
```bash
npm run drizzle:migrate
```

### 3. Add `TURNSTILE_SECRET` to env — `src/config/env.ts`
Add `TURNSTILE_SECRET: z.string().min(1)` inside the `envSchema` object.
Use Cloudflare's test secret `1x0000000000000000000000000000000AA` in `.env` locally (always returns `success: true`).

### 4. Implement rate limiter — `src/middleware/rateLimit.middleware.ts`
Export `contactRateLimiter` using `rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests..." } })`.

### 5. Create Zod schemas — `src/zodschemas/contact.ts`
- `SubmitContactSchema` — `name`, `email` (z.string().email()), `subject`, `message`, `turnstileToken`
- `ContactParamsSchema` — `id` (z.string().uuid())
- `UpdateContactStatusSchema` — `status` (z.enum(["new", "read", "replied", "archived"]))
- Export inferred types for each.

### 6. Create repository — `src/modules/contact/contact.repository.ts`
- `findAll()` — select all, ordered by `createdAt desc`
- `findById(id)` — select where id, limit 1
- `create(data)` — insert and return
- `updateStatus(id, status)` — update and return
- Export `ContactMessageRow` type (`InferSelectModel<typeof contactMessages>`)

### 7. Create service — `src/modules/contact/contact.service.ts`
- `submitContactMessage(data, ipAddress?)`:
  1. POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` via axios with `application/x-www-form-urlencoded` body (`secret`, `response`, optional `remoteip`)
  2. If `response.data.success === false` → `throw new AppError(422, "Turnstile verification failed.")`
  3. Save via `contactRepo.create(...)`
  4. Fire-and-forget confirmation email via `sendEmail(email, subject, html).catch(err => console.error(...))`
  5. Return the saved record
- `listContactMessages()` — returns `contactRepo.findAll()`
- `updateContactStatus(id, data)` — find by ID (throw 404 if missing), call `contactRepo.updateStatus()`, return updated

Reuse: `sendEmail` from `src/utils/email.ts`, `AppError` from `src/shared/errors/AppError.ts`, `env` from `src/config/index.ts`, `axios` (already installed)

### 8. Create controller — `src/modules/contact/contact.controller.ts`
Three handlers following the departments controller pattern:
- `submitContactHandler` — parse body with `SubmitContactSchema`, call service, return 201 with `{ id }` only (not full record)
- `listContactMessagesHandler` — call service, return 200 with `data.messages`
- `updateContactStatusHandler` — parse params with `ContactParamsSchema` + body with `UpdateContactStatusSchema`, call service, return 200 with updated record

### 9. Create router — `src/modules/contact/contact.router.ts`
```
POST /            → contactRateLimiter, submitContactHandler           (public)
GET  /            → authenticate, requireRole(ADMIN, SUPER_ADMIN), listContactMessagesHandler
PATCH /:id/status → authenticate, requireRole(ADMIN, SUPER_ADMIN), updateContactStatusHandler
```
Imports:
- `authenticate` from `../../middleware/auth.middleware`
- `requireRole` from `../../middleware/rabc.middleware`
- `contactRateLimiter` from `../../middleware/rateLimit.middleware`
- `USER_ROLES` from `../../utils/constants`

### 10. Update module index — `src/modules/contact/index.ts`
Add `export { default as contactRouter } from "./contact.router"` alongside the existing schema exports.

### 11. Mount router — `src/app.ts`
```ts
import { contactRouter } from "./modules/contact";
app.use("/api/v1/contact", contactRouter);  // before notFoundRouteMiddleware
```

---

## Critical Files

| File | Action |
|------|--------|
| `src/config/env.ts` | Add `TURNSTILE_SECRET` |
| `src/middleware/rateLimit.middleware.ts` | Implement `contactRateLimiter` |
| `src/modules/contact/contact.schema.ts` | READ ONLY — do not modify |
| `src/db/index.ts` | READ ONLY — already exports contact schema |
| `src/utils/email.ts` | Reuse `sendEmail` |
| `src/modules/departments/department.router.ts` | Reference for route pattern |

---

## Verification

1. Start server: `npm run dev` — no env errors on startup
2. `POST /api/v1/contact` with invalid email → `400` with `errors.email` (before Turnstile runs)
3. `POST /api/v1/contact` with invalid Turnstile token → `422`
4. `POST /api/v1/contact` with valid payload + test token → `201`
5. Fire 6 rapid POSTs → 6th returns `429`
6. `GET /api/v1/contact` without auth → `401`
7. `GET /api/v1/contact` with admin token → `200` with messages array
8. `PATCH /api/v1/contact/:id/status` with `{ status: "read" }` → `200` with updated record
9. `PATCH /api/v1/contact/:uuid/status` with `{ status: "pending" }` → `400`
10. `PATCH /api/v1/contact/<unknown-id>/status` → `404`
