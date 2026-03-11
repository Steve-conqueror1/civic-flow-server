# Plan: API Documentation

## Context

`src/openapi.ts` has a swagger-jsdoc skeleton with an empty `apis: []` array, meaning no routes are documented. The packages needed are already installed (`swagger-jsdoc`, `@scalar/express-api-reference`). The goal is to wire everything up and add OpenAPI JSDoc annotations to all 53 routes across 8 modules.

---

## Critical Files

| File                                               | Change                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/openapi.ts`                                   | Fix `apis` glob, add `components` (schemas, security) and `tags` |
| `src/app.ts`                                       | Mount Scalar UI + raw OpenAPI JSON endpoints                     |
| `src/modules/auth/auth.router.ts`                  | Add JSDoc OpenAPI comments (12 routes)                           |
| `src/modules/users/users.router.ts`                | Add JSDoc OpenAPI comments (9 routes)                            |
| `src/modules/departments/department.router.ts`     | Add JSDoc OpenAPI comments (5 routes)                            |
| `src/modules/serviceCategories/category.router.ts` | Add JSDoc OpenAPI comments (5 routes)                            |
| `src/modules/services/service.router.ts`           | Add JSDoc OpenAPI comments (12 routes)                           |
| `src/modules/serviceRequests/requests.router.ts`   | Add JSDoc OpenAPI comments (6 routes)                            |
| `src/modules/contact/contact.router.ts`            | Add JSDoc OpenAPI comments (3 routes)                            |
| `src/modules/health/health.router.ts`              | Add JSDoc OpenAPI comments (1 route)                             |

---

## Step 1 — Fix `src/openapi.ts`

### `apis` array — use a glob pattern (best practice)

Replace the empty `apis: []` with a glob that auto-picks up all current and future router files:

```
apis: ["./src/modules/**/*.router.ts"]
```

This is future-proof — any new module router is picked up automatically without touching `openapi.ts`.

### Add `components` to the OpenAPI definition

Add under the `definition` object:

**Security schemes:**

- `cookieAuth` — `apiKey` in `cookie`, name `access_token` (how this API authenticates)

**Shared schemas (reused across routes):**

- `Pagination` — `{ page: integer, limit: integer, total: integer }`
- `Error` — `{ success: false, message: string }`
- `ValidationError` — `{ success: false, message: string, errors: object }`

### Add `tags` to the definition

One tag per module: `Health`, `Auth`, `Users`, `Departments`, `Categories`, `Services`, `ServiceRequests`, `Contact`. Tags give the Scalar UI its grouped navigation.

---

## Step 2 — Mount docs in `src/app.ts`

Import `openApiSpec` from `./openapi` and `apiReference` from `@scalar/express-api-reference`.

Mount **after all API routes, before** the not-found and error handlers:

- `GET /api/docs/openapi.json` → `res.json(openApiSpec)` (raw spec for tooling)
- `GET /api/docs` → Scalar UI, pointed at `/api/docs/openapi.json`

This keeps docs at a predictable, non-versioned path separate from `/api/v1/`.

---

## Step 3 — Add JSDoc annotations to each router file

Place `@openapi` JSDoc blocks directly above each route registration in the router files. This keeps annotations co-located with route definitions.

### Format per route

```
/**
 * @openapi
 * /v1/path:
 *   method:
 *     tags: [TagName]
 *     summary: One-line description
 *     security: [{cookieAuth: []}]   ← omit for public routes
 *     requestBody: ...               ← omit for GET routes
 *     parameters: ...                ← for path/query params
 *     responses:
 *       200:
 *         description: ...
 *       400:
 *         $ref: '#/components/schemas/ValidationError'
 *       401:
 *         $ref: '#/components/schemas/Error'
 */
```

Note: swagger-jsdoc strips the `/api` mount prefix, so paths in JSDoc are written as `/v1/users/count`, not `/api/v1/users/count`. The base URL in the `servers` field (`env.API_ENDPOINT`, which defaults to `http://localhost:5006/api`) already includes `/api`.

### Route-by-route coverage

**Health (1 route):** `GET /health` — 200 response only.

**Auth (12 routes):** Register, login, logout, email verify, resend verification, password reset request, password reset, refresh token, MFA setup, MFA confirm, MFA verify, get current user. Include request body schemas for register and login inline (email, password, firstName, lastName). Use `$ref` for shared Error/ValidationError.

**Users (9 routes):** Count (public), get/update/delete me (authenticated), list/get/update/deactivate/delete by ID (admin). Pagination query params for list endpoint.

**Departments (5 routes):** List (public), get by ID (public), create, update, set status (admin). Include inline schema for department body (name, description, icon).

**Categories (5 routes):** Same pattern as departments.

**Services (12 routes):** Mix of public list/search/grouped endpoints and admin CRUD. Note `search` query param for the search endpoint.

**Service Requests (6 routes):** Include multipart/form-data for upload endpoint (files field, max 4, accepted MIME types). Status enum for status update (`open | in_progress | under_review | pending_review | resolved | rejected | closed`).

**Contact (3 routes):** POST (public, rate-limited), list (admin), update status (admin). Include contact form body schema (name, email, subject, message).

---

## Verification

1. Run `npm run dev`
2. Open `http://localhost:5002/api/docs` — Scalar UI should render with all modules in the sidebar
3. Open `http://localhost:5002/api/docs/openapi.json` — raw JSON spec should list all routes
4. TypeScript check: `npx tsc --noEmit` (no new types introduced, should still pass)
