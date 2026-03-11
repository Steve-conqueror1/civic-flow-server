# Spec for Users Count

branch: claude/api-feat/users-count

## Summary

A public API endpoint that returns the total number of registered users in the database. This endpoint requires no authentication and is intended for display purposes (e.g., a public-facing counter on the platform's landing page or stats dashboard).

## Functional Requirements

- Expose a public `GET /api/v1/users/count` endpoint with no authentication required.
- The response returns the total count of all registered users in the `users` table.
- The count reflects all users regardless of role, verification status, or account lock status.
- The endpoint must return a JSON response with a clearly named field (e.g., `count`).

## Possible edge cases (only if referenced)

- If the database query fails, the global error handler should return an appropriate 500 response.
- If no users exist yet, the count should return `0` rather than null or an error.

## Acceptance Criteria

- `GET /api/v1/users/count` is accessible without any authentication token or cookie.
- The response body includes the total registered user count as a number.
- The endpoint returns HTTP 200 on success.
- The endpoint does not expose any user PII or sensitive data — only the numeric count.

## Open Questions

- Should the count exclude soft-deleted or banned/locked users, or include all rows? yes
- Is caching needed for this endpoint (e.g., Redis TTL) to avoid repeated DB hits under high traffic? yes
- Should the count be scoped by role in the future (e.g., count only citizens)? Only citizens

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Returns 200 with a numeric `count` field when users exist in the database.
- Returns 200 with `count: 0` when no users are in the database.
- Endpoint is accessible without an authorization header or cookie.
- Endpoint does not return any user fields other than the count.
