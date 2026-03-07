# Plan: Service Categories API

## Context

CivicFlow needs a service categories module so citizens can browse the types of services available on the platform. The schema and migration already exist (`categories` table with `id`, `name`, `slug`, `description`, `icon`, `isActive`, timestamps). What's needed is the full module implementation: repository, service, controller, router, Zod schemas, and registration in `app.ts`.

Spec answers already resolved:

- Inactive categories ARE returned for admins via `GET /:id`, but 404 for public
- No pagination — return all active categories in the list endpoint
- Flat list, no sub-categories, no ordering

---

## Endpoints

All routes mounted at `/api/v1/categories` (consistent with auth router which uses `/api/v1`).

| Method | Path                            | Auth         | Description                                         |
| ------ | ------------------------------- | ------------ | --------------------------------------------------- |
| GET    | `/api/v1/categories`            | Public       | List all active categories                          |
| GET    | `/api/v1/categories/:id`        | Public/Admin | Get one; 404 if inactive (public), visible to admin |
| POST   | `/api/v1/categories`            | Admin        | Create category                                     |
| PATCH  | `/api/v1/categories/:id`        | Admin        | Edit name/description/icon                          |
| PATCH  | `/api/v1/categories/:id/status` | Admin        | Toggle isActive                                     |

---

## Files to Create

### 1. `src/zodschemas/categories.ts`

Follows pattern of `src/zodschemas/auth.ts`.

- `CreateCategorySchema`: `{ name: string(1-255), description?: string, icon?: string }`
- `UpdateCategorySchema`: all fields optional (`name`, `description`, `icon`)
- Export inferred types

### 2. `src/modules/serviceCategories/category.repository.ts`

Follows pattern of `src/modules/auth/auth.repository.ts`. Uses `drizzle(pool)` and queries the `categories` table.

Functions:

- `findAllActive()` — `select where isActive = true`
- `findById(id)` — `select where id = id, limit 1`
- `findByName(name)` — `select where name = name, limit 1` (for duplicate check)
- `create(data)` — insert returning
- `update(id, data)` — update set fields where id
- `setStatus(id, isActive)` — update isActive where id

### 3. `src/modules/serviceCategories/category.service.ts`

Business logic layer. Throws `AppError` from `../../shared/errors/AppError`.

Functions:

- `getAllActiveCategories()` — delegates to repo
- `getCategoryById(id, isAdmin: boolean)` — if not found → 404; if not active and not admin → 404; else return
- `createCategory(data)` — check name uniqueness (409 if duplicate), generate slug from name, call repo.create
- `updateCategory(id, data)` — check category exists (404); if name changed, check uniqueness; regenerate slug if name changed; call repo.update
- `updateCategoryStatus(id, isActive)` — check category exists (404); call repo.setStatus

**Slug generation:** convert name to lowercase, replace spaces/special chars with `-`, strip leading/trailing hyphens. Pure string utility, no external package needed.

### 4. `src/modules/serviceCategories/category.controller.ts`

Follows pattern of `src/modules/auth/auth.controller.ts`.

Handlers:

- `listCategoriesHandler` — `GET /` — calls service.getAllActiveCategories, returns 200
- `getCategoryHandler` — `GET /:id` — reads `req.user` to determine isAdmin flag, calls service.getCategoryById
- `createCategoryHandler` — `POST /` — Zod safeParse CreateCategorySchema, calls service.createCategory, returns 201
- `updateCategoryHandler` — `PATCH /:id` — Zod safeParse UpdateCategorySchema, calls service.updateCategory, returns 200
- `updateCategoryStatusHandler` — `PATCH /:id/status` — reads `isActive` boolean from body, calls service.updateCategoryStatus, returns 200

All handlers: try/catch + `next(err)`. Standardized response `{ success, message, data? }`.

### 5. `src/modules/serviceCategories/category.router.ts`

Follows pattern of `src/modules/auth/auth.router.ts`.

Middleware imports:

- `authenticate` from `../../middleware/auth.middleware`
- `requireRole` from `../../middleware/rabc.middleware`

Route setup:

- `GET /` — public — listCategoriesHandler
- `GET /:id` — public — getCategoryHandler
- `POST /` — authenticate + requireRole("admin", "super_admin") — createCategoryHandler
- `PATCH /:id` — authenticate + requireRole("admin", "super_admin") — updateCategoryHandler
- `PATCH /:id/status` — authenticate + requireRole("admin", "super_admin") — updateCategoryStatusHandler

---

## Files to Modify

### `src/modules/serviceCategories/index.ts`

Add router export alongside existing schema export:

- Export `categoriesRouter` from `./category.router`
- Keep existing `categories` schema export

### `src/app.ts`

Import `categoriesRouter` from `./modules/serviceCategories` and mount:

- `app.use("/api/v1/categories", categoriesRouter)`
- Place alongside the existing `authRouter` mount, before the error handlers

---

## Key Conventions to Follow

- Drizzle instance: `drizzle(pool)` using `pool` from `../../config`
- Error class: `AppError` from `../../shared/errors/AppError`
- Response shape: `{ success: boolean, message: string, data?: any }`
- Zod validation: `schema.safeParse(req.body)` → return 400 with `errors: parsed.error.flatten().fieldErrors` on failure
- JSDoc route comments on each controller handler

---

## Verification

1. Start dev server: `npm run dev`
2. Public list: `GET http://localhost:5000/api/v1/categories` → 200 with empty array
3. Create (no auth): `POST http://localhost:5000/api/v1/categories` → 401
4. Create (citizen token): same → 403
5. Create (admin token): `POST` with `{ name, description }` → 201 with new category
6. Duplicate name: `POST` same name → 409
7. Public get active: `GET /api/v1/categories/:id` → 200
8. Deactivate: `PATCH /api/v1/categories/:id/status` `{ isActive: false }` → 200
9. Public get inactive: `GET /api/v1/categories/:id` → 404
10. Admin get inactive: same with admin token → 200
11. Edit: `PATCH /api/v1/categories/:id` `{ name: "New Name" }` → 200, slug updated
