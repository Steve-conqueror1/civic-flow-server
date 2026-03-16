# Spec for Get Service By Slug

branch: claude/api-feat/get-service-by-slug

## Summary

Add a public GET endpoint that retrieves a single service by its slug, returning the service details along with its associated department (id and name) and category (id and name). This endpoint is intended for public-facing service detail pages.

## Functional Requirements

- Expose a `GET /api/v1/services/:slug` endpoint (or similar) that accepts a slug path parameter
- Look up the service by its slug field
- Join the service with its associated department and category
- Return the service fields along with `departmentId`, `departmentName`, `categoryId`, and `categoryName` in the response
- The endpoint should be publicly accessible (no authentication required)

## Possible edge cases (only if referenced)

- Slug does not match any service — return 404
- Service exists but its department or category has been deleted (orphaned foreign key) — return 404 or surface a safe error

## Acceptance Criteria

- `GET /api/v1/services/:slug` returns 200 with the service object including `departmentId`, `departmentName`, `categoryId`, and `categoryName`
- Returns 404 when no service matches the given slug
- The slug lookup is case-insensitive or exactly matches the stored value (document which)
- No authentication token is required to access this endpoint

## Open Questions

- Should the slug lookup be case-insensitive? yes
- Should the full service object be returned, or only a subset of fields? name, description, instructions, slug
- Is there an existing services list endpoint whose response shape this should mirror? no, only a repository

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Returns the correct service with department and category details for a valid slug
- Returns 404 for a slug that does not exist
- Response shape includes `departmentId`, `departmentName`, `categoryId`, and `categoryName`

## IMPORTANT

- There already exists `GET /api/v1/services/:id`. Refactor this route to `GET /api/v1/services/id:id`
- Implement get service by slug at `GET /api/v1/services/:slug`
