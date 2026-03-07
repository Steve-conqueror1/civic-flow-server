# Spec for Service Categories

branch: claude/api-feat/service-categories

## Summary

Expose a service categories API with public read access and admin-only write access. Citizens and unauthenticated users can browse all active categories or fetch a single one. Admins can create, edit, and toggle the active state of categories to control what services are visible on the platform.

## Functional Requirements

- Any user (authenticated or not) can retrieve a list of all active service categories
- Any user can retrieve a single service category by its ID
- Admin users can create a new service category
- Admin users can edit an existing service category (name, description, etc.)
- Admin users can activate or deactivate a service category
- Deactivated categories must not appear in public listing responses
- Category names must be unique

## Possible edge cases (only if referenced)

- Attempting to fetch a single category that does not exist should return 404
- Attempting to create a category with a duplicate name should return a clear validation error
- Deactivating a category that is already inactive (and vice versa) should be handled gracefully — either a no-op or a meaningful response
- Admin endpoints must reject requests from non-admin roles with 403

## Acceptance Criteria

- `GET /api/categories` returns only active categories for public access but all regardless of active state for admins
- `GET /api/categories/:id` returns a single category regardless of active state for admins, but returns 404 for inactive categories for public access
- `POST /api/categories` creates a new category and is restricted to admin users
- `PATCH /api/categories/:id` updates category fields and is restricted to admin users
- `PATCH /api/categories/:id/status` toggles the active/inactive state and is restricted to admin users
- All write endpoints validate the request body and return 400 on invalid input
- Unauthorized access to admin endpoints returns 401; forbidden role returns 403

## Open Questions

- Should inactive categories still be retrievable via `GET /api/categories/:id` for admins, or return 404 for everyone? yes
- Is there a need for pagination on the public listing endpoint now, or can it return all active categories? just return all categories
- Should categories support ordering/priority to control display sequence on the client? no
- Are there sub-categories planned, or is this a flat list? just flat, no sub-categories

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Public listing returns only active categories
- Public fetch of a valid active category returns correct data
- Public fetch of a non-existent or inactive category returns 404
- Admin can create a category with valid data
- Admin create fails with duplicate name
- Admin create fails with invalid/missing fields
- Admin can update a category's fields
- Admin can activate and deactivate a category
- Non-admin cannot access create, update, or status endpoints (403)
- Unauthenticated user cannot access admin endpoints (401)
