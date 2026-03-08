# Spec for Services API

branch: claude/api-feat/services-api

## Summary

Expose a full set of REST endpoints for the `services` domain. Public consumers (citizens) can browse, search, and filter services in various ways. Administrators can manage the service catalogue by creating, editing, deleting, and toggling the active state of services.

## Functional Requirements

### Public Endpoints (no authentication required)

- **List all services** — Return a paginated list of all active services with basic details.
- **Get single service** — Return full details of one service by its ID.
- **Search services** — Accept a query string and return matching services (search across name and description fields).
- **List services by category** — Return all active services that belong to a given category ID.
- **List services by department** — Return all active services that belong to a given department ID.
- **Services grouped by category** — Return all active services organised into groups, one group per category.
- **Services grouped by department** — Return all active services organised into groups, one group per department.

### Admin Endpoints (authenticated, admin or super_admin role required)

- **Create service** — Add a new service to the catalogue. Required fields: name, description, department ID, category ID. Optional fields: any additional metadata fields present on the schema.
- **Update service** — Edit an existing service by ID. All fields are optional (partial update).
- **Delete service** — Permanently remove a service by ID. Should be blocked if the service has associated open or in-progress service requests.
- **Activate service** — Set a service's active flag to `true`.
- **Deactivate service** — Set a service's active flag to `false`. Deactivated services must not appear in public listing and search results.

### Filtering & Pagination (public list endpoints)

- All list endpoints should support `page` and `limit` query parameters.
- The services-by-category and services-by-department endpoints receive the relevant ID as a route parameter.

## Possible Edge Cases (only if referenced)

- Requesting a service by an ID that does not exist should return 404.
- Requesting services for a category or department ID that does not exist should return 404.
- Deleting a service that has associated open or in-progress requests should return a 409 conflict.
- Searching with an empty or whitespace-only query string should return a 400 validation error.
- Activating a service that is already active (or deactivating one already inactive) should be a no-op and return success without error.
- Grouped endpoints should return an empty array for a group if it has no active services, rather than omitting the group entirely.

## Acceptance Criteria

- `GET /api/v1/services` returns a paginated list of active services.
- `GET /api/v1/services/:id` returns a single service or 404.
- `GET /api/v1/services/search?q=<term>` returns matching active services; returns 400 if `q` is missing or blank.
- `GET /api/v1/services/category/:categoryId` returns active services for that category or 404 if category not found.
- `GET /api/v1/services/department/:departmentId` returns active services for that department or 404 if department not found.
- `GET /api/v1/services/grouped/category` returns active services grouped by category.
- `GET /api/v1/services/grouped/department` returns active services grouped by department.
- `POST /api/v1/services` (admin) creates a new service; returns 400 for invalid input, 201 on success.
- `PATCH /api/v1/services/:id` (admin) updates a service; returns 404 if not found, 200 on success.
- `DELETE /api/v1/services/:id` (admin) deletes a service; returns 409 if blocked by active requests, 204 on success.
- `PATCH /api/v1/services/:id/activate` (admin) sets active to true; returns 200.
- `PATCH /api/v1/services/:id/deactivate` (admin) sets active to false; returns 200.
- All admin endpoints return 401 if unauthenticated and 403 if the caller lacks admin role.
- Pagination metadata (`page`, `limit`, `total`) is returned alongside data on all list endpoints.

## Open Questions

- Should soft-delete be used instead of hard-delete for services, to preserve historical links from service requests? soft
- Is there a maximum `limit` cap on pagination (e.g., 100 items per page)? 10 per page
- Should inactive services be visible to admins in list/search endpoints (via an `includeInactive` flag)? yes
- Should grouped endpoints also support pagination within each group? just limit per group

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Public list endpoint returns only active services and respects pagination.
- Single service endpoint returns 404 for an unknown ID.
- Search returns results for a matching term and 400 for a blank query.
- Category and department filter endpoints return correct subsets and 404 for unknown IDs.
- Grouped endpoints return the expected structure.
- Admin create endpoint rejects invalid input with 400 and succeeds with valid input.
- Admin delete is blocked with 409 when active requests exist.
- Activate/deactivate endpoints toggle state correctly.
- Unauthenticated requests to admin endpoints return 401; citizen-role requests return 403.
