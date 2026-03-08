# Services API — Implementation Plan

## Context

The `services` module at `src/modules/services/` is currently scaffolded with only a schema file. This plan implements the full REST API for the services domain: public browsing/search/filter endpoints and admin CRUD + activation/deactivation endpoints. The implementation follows the `serviceCategories` module as the gold-standard pattern.

---

## Key Decisions & Gotchas

1. **Soft delete not possible**: Schema has no `deletedAt` column and the schema cannot be modified. DELETE is a hard delete, guarded by an active-requests check (409 on block).

2. **Repository `db` import**: Use `import { db } from "../../config"` — NOT `pool` (the categories repo has a bug importing `pool` which is not exported; auth repo has the correct pattern).

3. **Slug is globally unique**: `slug` column is `.unique()` across all services. Since the same name can exist in different departments, slug collisions are possible. Handle by appending `-2`, `-3`, etc. if the initial slug is taken.

4. **Route ordering is critical**: Static paths (`/search`, `/grouped/category`, `/grouped/department`) must be registered before `/:id` in the router or Express will swallow them as param matches.

5. **`includeInactive` flag**: Public `GET /` uses `optionalAuthenticate`; controller only honours `includeInactive=true` when `req.user?.role` is `admin` or `super_admin`.

6. **Active request statuses for delete guard**: Block deletion when service has requests with status in `['open', 'in_progress', 'under_review', 'pending_review']`. Allow deletion if all are `resolved`, `rejected`, or `closed`.

7. **Grouped endpoints — empty groups**: Use a left join from categories/departments to active services so that groups with zero services still appear with `services: []`.

8. **Duplicate name scope**: Index `service_department_unique` covers `(name, departmentId)`. Two services can share a name across different departments. `findByName` must accept both params.

---

## Files to Create

### 1. `src/zodschemas/services.ts`

Define all Zod schemas and export inferred TypeScript types.

- `CreateServiceSchema` — `name` (string, min 1, max 255), `description?` (string), `instructions?` (string), `categoryId` (uuid), `departmentId` (uuid), `minResponseDays?` (int, min 1), `maxResponseDays?` (int, min 1). Add `.refine()` to enforce `maxResponseDays >= minResponseDays` when both are provided.
- `UpdateServiceSchema` — `CreateServiceSchema.partial()` with the same cross-field refine.
- `ServiceQuerySchema` — `page` (coerce int, default 1), `limit` (coerce int, max 100, default 10), `includeInactive` (coerce boolean, optional).
- `ServiceSearchQuerySchema` — `q` (string, min 1, "Search term cannot be blank"), `page`, `limit`.
- `GroupedQuerySchema` — `limit` (coerce int, max 50, default 10).

Exported types: `CreateServiceBody`, `UpdateServiceBody`, `ServiceQuery`, `ServiceSearchQuery`, `GroupedQuery`.

### 2. `src/modules/services/service.repository.ts`

All DB queries via Drizzle. Imports: `db` from `../../config`, `services` from `./service.schema`, `serviceRequests` from `../serviceRequests/requests.schema`, `categories` from `../serviceCategories/category.schema`, `departments` from `../departments/department.schema`.

Export type: `export type ServiceRow = InferSelectModel<typeof services>`.

Functions:

| Function                                          | Description                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `findAll({ page, limit, includeInactive? })`      | Paginated list. If `!includeInactive`: filter `isActive=true`. Returns `{ rows, total }`.                                             |
| `findById(id)`                                    | Single row by PK. Returns `ServiceRow \| undefined`.                                                                                  |
| `findByName(name, departmentId)`                  | Uniqueness check on (name, departmentId) pair.                                                                                        |
| `findBySlug(slug)`                                | Slug collision check. Returns `ServiceRow \| undefined`.                                                                              |
| `search({ q, page, limit })`                      | Active services where name or description ilike `%q%`. Returns `{ rows, total }`.                                                     |
| `findByCategory({ categoryId, page, limit })`     | Active services for category. Returns `{ rows, total }`.                                                                              |
| `findByDepartment({ departmentId, page, limit })` | Active services for department. Returns `{ rows, total }`.                                                                            |
| `categoryExists(id)`                              | Returns `boolean` — checks categories table.                                                                                          |
| `departmentExists(id)`                            | Returns `boolean` — checks departments table.                                                                                         |
| `findGroupedByCategory(limitPerGroup)`            | Left join categories → active services. Group in JS. Returns `Array<{ categoryId, categoryName, services: ServiceRow[] }>`.           |
| `findGroupedByDepartment(limitPerGroup)`          | Same pattern with departments.                                                                                                        |
| `create(data)`                                    | Insert and return row via `.returning()[0]`.                                                                                          |
| `update(id, data)`                                | Update and return via `.returning()[0]`. Returns `ServiceRow \| undefined`.                                                           |
| `remove(id)`                                      | Hard delete.                                                                                                                          |
| `hasActiveRequests(serviceId)`                    | Count serviceRequests where `serviceId=id` and `status IN ['open','in_progress','under_review','pending_review']`. Returns `boolean`. |

### 3. `src/modules/services/service.service.ts`

Business logic. Imports AppError, serviceRepo, and Zod inferred types.

Include `toSlug(name: string): string` — same implementation as `category.service.ts` (local copy, not shared).

Include `generateUniqueSlug(name: string): Promise<string>` — generates slug, then checks `repo.findBySlug(slug)`. If taken, tries `slug-2`, `slug-3`, etc.

Functions:

| Function                                          | Returns                    | Notes                                                                                                        |
| ------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `listServices({ page, limit, includeInactive })`  | `{ services, pagination }` | Straight delegation to repo.                                                                                 |
| `getServiceById(id)`                              | `ServiceRow`               | Throws `AppError(404)` if not found.                                                                         |
| `searchServices({ q, page, limit })`              | `{ services, pagination }` | Delegation.                                                                                                  |
| `listByCategory({ categoryId, page, limit })`     | `{ services, pagination }` | Throws `AppError(404, "Category not found.")` if `!repo.categoryExists(categoryId)`.                         |
| `listByDepartment({ departmentId, page, limit })` | `{ services, pagination }` | Throws `AppError(404, "Department not found.")` if `!repo.departmentExists(departmentId)`.                   |
| `getGroupedByCategory(limitPerGroup)`             | grouped array              | Delegation.                                                                                                  |
| `getGroupedByDepartment(limitPerGroup)`           | grouped array              | Delegation.                                                                                                  |
| `createService(data)`                             | `ServiceRow`               | Check `findByName(name, departmentId)` → 409. Generate unique slug. Call `repo.create`.                      |
| `updateService(id, data)`                         | `ServiceRow`               | Find existing → 404. If name changes, re-check name uniqueness and regenerate slug. Call `repo.update`.      |
| `deleteService(id)`                               | `void`                     | Find existing → 404. Check `hasActiveRequests` → 409. Call `repo.remove`.                                    |
| `activateService(id)`                             | `ServiceRow`               | Find existing → 404. If already active, return existing (no-op). Else `repo.update(id, { isActive: true })`. |
| `deactivateService(id)`                           | `ServiceRow`               | Same pattern, set `isActive: false`.                                                                         |

### 4. `src/modules/services/service.controller.ts`

HTTP handlers. All follow try/catch with `next(err)`. Standard response shape:
`{ success: true, message: "...", data: { service(s): ..., pagination?: ... } }`

Handlers:

| Handler                         | Parses from                                | Status        |
| ------------------------------- | ------------------------------------------ | ------------- |
| `listServicesHandler`           | `req.query` via `ServiceQuerySchema`       | 200           |
| `searchServicesHandler`         | `req.query` via `ServiceSearchQuerySchema` | 200 / 400     |
| `getGroupedByCategoryHandler`   | `req.query` via `GroupedQuerySchema`       | 200           |
| `getGroupedByDepartmentHandler` | `req.query` via `GroupedQuerySchema`       | 200           |
| `listByCategoryHandler`         | `req.params.categoryId` + query            | 200           |
| `listByDepartmentHandler`       | `req.params.departmentId` + query          | 200           |
| `getServiceHandler`             | `req.params.id`                            | 200           |
| `createServiceHandler`          | `req.body` via `CreateServiceSchema`       | 201 / 400     |
| `updateServiceHandler`          | `req.body` via `UpdateServiceSchema`       | 200 / 400     |
| `deleteServiceHandler`          | `req.params.id`                            | 204 (no body) |
| `activateServiceHandler`        | `req.params.id`                            | 200           |
| `deactivateServiceHandler`      | `req.params.id`                            | 200           |

`listServicesHandler` only passes `includeInactive: true` to the service layer if `parsed.data.includeInactive === true` AND `req.user?.role` is `"admin"` or `"super_admin"`.

Grouped response data shape: `{ groups: [{ category: { id, name }, services: [...], total: n }] }`.

### 5. `src/modules/services/service.router.ts`

```
PUBLIC (optionalAuthenticate where req.user is needed):
  GET /                        optionalAuthenticate → listServicesHandler
  GET /search                  searchServicesHandler
  GET /grouped/category        getGroupedByCategoryHandler
  GET /grouped/department      getGroupedByDepartmentHandler
  GET /category/:categoryId    listByCategoryHandler
  GET /department/:departmentId listByDepartmentHandler
  GET /:id                     getServiceHandler   ← must be last GET

ADMIN [authenticate, requireRole("admin","super_admin")]:
  POST /                       createServiceHandler
  PATCH /:id/activate          activateServiceHandler  ← before /:id
  PATCH /:id/deactivate        deactivateServiceHandler ← before /:id
  PATCH /:id                   updateServiceHandler
  DELETE /:id                  deleteServiceHandler
```

### 6. `src/modules/services/index.ts`

```ts
export { default as servicesRouter } from "./service.router";
export { services } from "./service.schema";
```

### 7. `vitest.config.ts` (project root)

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { globals: true, environment: "node" } });
```

### 8. `tests/services.test.ts`

Mock the service layer with `vi.mock`. Tests cover:

- Public list returns only active services, respects pagination.
- `GET /:id` returns 404 for unknown ID.
- `GET /search` returns 400 for blank/missing `q`, results for valid term.
- Category/department filter returns 404 for unknown IDs.
- Grouped endpoints return expected structure.
- Admin `POST /` returns 400 for invalid body, 409 for duplicate name, 201 on success.
- Admin `DELETE /:id` returns 409 when active requests exist, 204 on success.
- Activate/deactivate toggle state correctly.
- Unauthenticated admin requests → 401; citizen role → 403.

Auth in tests: generate a valid JWT signed with a test `JWT_SECRET` in `beforeAll` and attach as `access_token` cookie via Supertest.

---

## Files to Modify

### `src/app.ts`

Add import of `servicesRouter` from `./modules/services` and mount:

```ts
app.use("/api/v1/services", servicesRouter);
```

Place after the categories mount, before error handlers.

### `src/zodschemas/index.ts`

Append exports for all services schemas and types.

### `package.json`

Add dev deps: `vitest`, `@vitest/coverage-v8`, `supertest`, `@types/supertest`.
Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

---

## Implementation Order

1. `src/zodschemas/services.ts`
2. `src/zodschemas/index.ts` (append exports)
3. `src/modules/services/service.repository.ts`
4. `src/modules/services/service.service.ts`
5. `src/modules/services/service.controller.ts`
6. `src/modules/services/service.router.ts`
7. `src/modules/services/index.ts`
8. `src/app.ts` (mount router)
9. `package.json` + `vitest.config.ts`
10. `tests/services.test.ts`

---

## Verification

1. `npm run build` — zero TypeScript errors.
2. `npm run dev` — server starts, "Database connected" in logs.
3. Manual smoke tests:
   - `GET /api/v1/services` → 200 with `pagination` metadata.
   - `GET /api/v1/services/search?q=` → 400.
   - `GET /api/v1/services/search?q=permit` → 200.
   - `GET /api/v1/services/grouped/category` → 200 with `groups` array.
   - `GET /api/v1/services/<random-uuid>` → 404.
   - `POST /api/v1/services` (no auth) → 401.
   - `POST /api/v1/services` (citizen JWT) → 403.
   - `POST /api/v1/services` (admin JWT + valid body) → 201.
   - `DELETE /api/v1/services/<id-with-active-request>` (admin) → 409.
   - `DELETE /api/v1/services/<clean-id>` (admin) → 204.
4. `npm test` — all test cases pass.
