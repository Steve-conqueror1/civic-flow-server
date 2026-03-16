# Plan: Get Service By Slug

## Context

The frontend needs a public endpoint to load a service detail page by its URL slug. The existing `GET /:id` route uses a UUID which isn't URL-friendly. A slug-based endpoint is needed that also returns denormalized department and category names so the frontend doesn't need a second request. The existing `GET /:id` route must be moved to `GET /id/:id` to free up the `/:slug` param slot.

---

## Files to Modify

| File                                         | Change                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `src/modules/services/service.repository.ts` | Add `findBySlugWithRelations()`                                    |
| `src/modules/services/service.service.ts`    | Add `getServiceBySlug()`                                           |
| `src/modules/services/service.controller.ts` | Add `getServiceBySlugHandler`, update JSDoc on `getServiceHandler` |
| `src/modules/services/service.router.ts`     | Change `GET /:id` → `GET /id/:id`, add `GET /:slug`                |

---

## Step-by-Step Changes

### 1. `service.repository.ts` — add `findBySlugWithRelations`

Add a new exported type and function after the existing `findBySlug`:

```
export type ServiceWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  departmentId: string;
  departmentName: string;
  categoryId: string;
  categoryName: string;
};
```

New function `findBySlugWithRelations(slug: string)`:

- Normalize input: `slug.toLowerCase()`
- Query: `db.select({ id, name, slug, description, instructions from services; id/name from departments; id/name from categories })`
- `.from(services)`
- `.innerJoin(departments, eq(services.departmentId, departments.id))`
- `.innerJoin(categories, eq(services.categoryId, categories.id))`
- `.where(eq(services.slug, slug.toLowerCase()))`
- `.limit(1)`
- Return `result[0] | undefined`

`departments` and `categories` are already imported at the top of the file (lines 5–6).

### 2. `service.service.ts` — add `getServiceBySlug`

Import `ServiceWithRelations` from repository. Add:

```ts
export async function getServiceBySlug(
  slug: string,
): Promise<ServiceWithRelations> {
  const service = await serviceRepo.findBySlugWithRelations(slug);
  if (!service) throw new AppError(404, "Service not found.");
  return service;
}
```

### 3. `service.controller.ts` — add `getServiceBySlugHandler`

Add after `getServiceHandler`:

```ts
/**
 * @route   GET /api/v1/services/:slug
 * @desc    Get a single service by slug
 * @access  Public
 */
export const getServiceBySlugHandler = async (req, res, next) => {
  try {
    const service = await serviceService.getServiceBySlug(req.params.slug);
    res.status(200).json({
      success: true,
      message: "Service retrieved successfully.",
      data: { service },
    });
  } catch (err) {
    next(err);
  }
};
```

Update the JSDoc comment on `getServiceHandler` to reflect path change to `/id/:id`.

### 4. `service.router.ts` — route changes

Two targeted edits:

1. Change `router.get("/:id", getServiceHandler)` → `router.get("/id/:id", getServiceHandler)`
2. Import `getServiceBySlugHandler` and add `router.get("/:slug", getServiceBySlugHandler)` after the `/id/:id` route (before admin routes)

Router ordering is safe: all static-prefix routes (`/search`, `/grouped/...`, `/category/...`, `/department/...`, `/id/...`) are declared before `/:slug`, so they won't be shadowed.

---

## Response Shape

`GET /api/v1/services/:slug` → 200:

```json
{
  "success": true,
  "message": "Service retrieved successfully.",
  "data": {
    "service": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "description": "...",
      "instructions": "...",
      "departmentId": "...",
      "departmentName": "...",
      "categoryId": "...",
      "categoryName": "..."
    }
  }
}
```

---

## Verification

1. `npm run dev` — server starts without errors
2. `GET /api/v1/services/id/<uuid>` — still returns a service (refactored route works)
3. `GET /api/v1/services/<valid-slug>` — returns 200 with all 9 fields
4. `GET /api/v1/services/<UPPER-CASE-SLUG>` — returns 200 (case-insensitive)
5. `GET /api/v1/services/nonexistent-slug` — returns 404
6. Run tests in `tests/` folder
