# Department CRUD — Implementation Plan

## Context
The `departments` table and Drizzle schema already exist (`src/modules/departments/department.schema.ts`). The module currently has no HTTP layer. This plan adds the full CRUD API following the established controller → service → repository pattern used in the `services` and `users` modules.

Spec decisions already resolved:
- Soft delete only (toggle `isActive`) via a dedicated `PATCH /:id/status` endpoint
- `GET /` list is **public** (no auth required)
- Slug is **auto-generated** server-side from `name`; clients never send a slug

---

## Files to Create

### 1. `src/zodschemas/departments.ts`
- `CreateDepartmentSchema` — `name` (required), `description?`, `icon?`
- `UpdateDepartmentSchema` — all fields optional (partial of create)
- `UpdateDepartmentStatusSchema` — `isActive: boolean` (required)
- `ListDepartmentsQuerySchema` — `includeInactive?: boolean` (coerced)
- Export inferred types for all four schemas

### 2. `src/modules/departments/department.repository.ts`
- `DepartmentRow` type via `InferSelectModel<typeof departments>`
- `findAll(opts: { includeInactive?: boolean })` — returns all departments, filtered by `isActive` unless `includeInactive` is true
- `findById(id: string)` — returns one row or `undefined`
- `findByName(name: string)` — uniqueness check
- `findBySlug(slug: string)` — uniqueness check for slug generation loop
- `create(data)` — insert + returning
- `update(id, data)` — update + returning, returns `undefined` if not found
- `setStatus(id, isActive)` — update `isActive` + returning

### 3. `src/modules/departments/department.service.ts`
- `toSlug(name)` — lowercase, strip non-alphanumeric (keep hyphens), collapse hyphens
- `generateUniqueSlug(name)` — loops `findBySlug` with numeric suffix until unique (same pattern as `service.service.ts`)
- `listDepartments(opts)` — calls `repo.findAll`
- `getDepartmentById(id)` — calls `repo.findById`, throws `AppError(404)` if not found
- `createDepartment(data)` — checks `findByName` for 409, generates slug, calls `repo.create`
- `updateDepartment(id, data)` — checks existence (404), checks name uniqueness if `name` changed (409), regenerates slug if name changed, calls `repo.update`
- `setDepartmentStatus(id, isActive)` — checks existence (404), calls `repo.setStatus`

### 4. `src/modules/departments/department.controller.ts`
Five handlers following the standard pattern (safeParse → 400 | call service → JSON response → next(err)):
- `listDepartmentsHandler` — validates query with `ListDepartmentsQuerySchema`, returns `{ departments }`
- `getDepartmentByIdHandler` — reads `req.params.id`, returns `{ department }`
- `createDepartmentHandler` — validates body with `CreateDepartmentSchema`, returns 201 `{ department }`
- `updateDepartmentHandler` — validates body with `UpdateDepartmentSchema`, returns `{ department }`
- `setDepartmentStatusHandler` — validates body with `UpdateDepartmentStatusSchema`, returns `{ department }`

### 5. `src/modules/departments/department.router.ts`
```
GET    /            listDepartmentsHandler          (public)
GET    /:id          getDepartmentByIdHandler        (public)
POST   /            createDepartmentHandler         (authenticate + requireRole admin/super_admin)
PATCH  /:id/status   setDepartmentStatusHandler      (authenticate + requireRole admin/super_admin)
PATCH  /:id          updateDepartmentHandler         (authenticate + requireRole admin/super_admin)
```
`/:id/status` is defined before `/:id` to avoid route shadowing.

---

## Files to Modify

### 6. `src/modules/departments/index.ts`
Currently only exports the schema. Add:
```ts
export { default as departmentsRouter } from "./department.router";
```

### 7. `src/app.ts`
- Import `departmentsRouter` from `./modules/departments`
- Add `app.use("/api/v1/departments", departmentsRouter)` in the route block (before `notFoundRouteMiddleware`)

---

## Key Reuse References
- Slug generation pattern: `src/modules/services/service.service.ts` (`toSlug` + `generateUniqueSlug`)
- Repository pattern: `src/modules/services/service.repository.ts`
- Role enforcement: `src/middleware/rabc.middleware.ts` (`requireRole`)
- Auth guard: `src/middleware/auth.middleware.ts` (`authenticate`)
- Error throwing: `src/shared/errors/AppError.ts`
- Role constants: `src/utils/constants.ts` (`USER_ROLES`)

---

## No Schema Changes Required
- `department.schema.ts` already exists and is already re-exported from `src/db/index.ts`
- No migrations needed

---

## Verification
1. Start dev server: `npm run dev`
2. Public list: `GET /api/v1/departments` → 200 with array
3. Create (as admin): `POST /api/v1/departments` with `{ name, description }` → 201, slug auto-populated
4. Duplicate name: `POST` same name → 409
5. Update: `PATCH /api/v1/departments/:id` with `{ name }` → slug regenerated
6. Deactivate: `PATCH /api/v1/departments/:id/status` with `{ isActive: false }` → department hidden from public list
7. 404: `GET /api/v1/departments/<random-uuid>` → 404
8. Unauthenticated create: `POST /` without token → 401
9. Citizen role create: `POST /` with citizen token → 403
10. Run tests: `tests/department.test.ts`
