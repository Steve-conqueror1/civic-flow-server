# Plan: Popular Services Endpoint

## Context

Add a `GET /api/v1/services/popular` endpoint that returns the most-requested services in descending order of request count. Ties are broken alphabetically by service name. Only active services are included. The request count is used internally for ranking and is NOT exposed in the response. The endpoint is public (no auth required) and accepts an optional `limit` query param (default 4).

---

## Files to Modify

| File                                         | Change                           |
| -------------------------------------------- | -------------------------------- |
| `src/zodschemas/services.ts`                 | Add `PopularServicesQuerySchema` |
| `src/modules/services/service.repository.ts` | Add `findPopular(limit)`         |
| `src/modules/services/service.service.ts`    | Add `getPopularServices(limit)`  |
| `src/modules/services/service.controller.ts` | Add `getPopularServicesHandler`  |
| `src/modules/services/service.router.ts`     | Register `GET /popular` route    |

---

## Step-by-Step Implementation

### 1. Zod Schema — `src/zodschemas/services.ts`

Add a new exported schema and inferred type:

```
PopularServicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).default(4)
})

export type PopularServicesQuery = z.infer<typeof PopularServicesQuerySchema>
```

Pattern to follow: `GroupedQuerySchema` in the same file (coerced int with min/default).

---

### 2. Repository — `src/modules/services/service.repository.ts`

Add `findPopular(limit: number)`:

- LEFT JOIN `services` with `serviceRequests` on `serviceRequests.serviceId = services.id`
- WHERE `services.isActive = true`
- GROUP BY `services.id`
- SELECT all service columns + `count(serviceRequests.id)` as an aliased field (needed for ORDER BY)
- ORDER BY count DESC, then `services.name` ASC (alphabetical tiebreaker)
- LIMIT `limit`
- Returns `ServiceRow[]` — strip the count field before returning (map to service object only)

Drizzle imports needed: `count`, `desc`, `asc` (from `drizzle-orm`) — `asc` may need to be added to existing imports.

The `serviceRequests` table is available at `src/modules/serviceRequests/requests.schema.ts` and exported from `src/db/index.ts` — import it the same way `hasActiveRequests` already does in the same repository file.

---

### 3. Service Layer — `src/modules/services/service.service.ts`

Add `getPopularServices(limit: number)`:

- Delegates directly to `repo.findPopular(limit)`
- No extra business logic needed

---

### 4. Controller — `src/modules/services/service.controller.ts`

Add `getPopularServicesHandler`:

- Parse `req.query` with `PopularServicesQuerySchema.safeParse()`
- On failure: return `400 { success: false, message: "Validation failed", errors: fieldErrors }`
- On success: call `serviceService.getPopularServices(parsed.data.limit)`
- Return `200 { success: true, message: "Popular services retrieved successfully.", data: { services } }`

---

### 5. Router — `src/modules/services/service.router.ts`

Register the route **before** the `/:slug` catch-all:

```
router.get("/popular", getPopularServicesHandler);
```

Place it alongside the other static path routes (`/search`, `/grouped/category`, etc.).

---

## Verification

1. Start dev server: `npm run dev`
2. `GET /api/v1/services/popular` → returns 4 active services ordered by request count desc
3. `GET /api/v1/services/popular?limit=10` → returns up to 10
4. `GET /api/v1/services/popular?limit=0` → returns 400
5. `GET /api/v1/services/popular?limit=abc` → returns 400
6. Confirm inactive services are excluded from results
7. Confirm ties are broken alphabetically
