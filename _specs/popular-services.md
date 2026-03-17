# Spec for Popular Services

branch: claude/api-feat/popular-services

## Summary

Add a public endpoint that returns a list of the most popular services, ranked by the number of associated service requests in descending order. The endpoint accepts an optional `limit` query parameter (defaulting to 4) to control how many results are returned.

## Functional Requirements

- Expose a `GET /api/v1/services/popular` endpoint
- Return services sorted by their total number of service requests in descending order
- Accept an optional `limit` query parameter to control result count
- Default `limit` to 4 when not provided
- Each service in the response should include the service details alongside its request count (for transparency/debug purposes)
- The endpoint should be publicly accessible (no authentication required)

## Possible Edge Cases

- `limit` is provided but is not a valid positive integer — return a 400 error
- `limit` is zero or negative — return a 400 error
- Fewer services exist than the requested `limit` — return all available services without error
- No services have any requests yet — return the top `limit` services with a request count of zero, ordered by name or ID as a tiebreaker

## Acceptance Criteria

- `GET /api/v1/services/popular` returns 4 services by default
- `GET /api/v1/services/popular?limit=10` returns up to 10 services
- Results are ordered by service request count, highest first
- An invalid `limit` (non-integer, zero, negative) returns a 400 response with descriptive field errors
- Services with no requests are still eligible to appear if no other services with requests exist
- Response shape is consistent with the existing service list endpoint

## Open Questions

- Should this endpoint filter out inactive or archived services? yes
- Should ties in request count be broken by a secondary sort (e.g., alphabetical by name, or by `createdAt`)? alphabetically
- Should the request count be included in the response body, or just used internally for ranking? internally

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Returns 4 services by default when no `limit` is provided
- Returns the correct number of services when a valid `limit` is supplied
- Services are ordered by request count descending
- Returns a 400 when `limit` is not a valid positive integer
- Handles the case where fewer services exist than the requested `limit`
- Handles the case where no service has any requests (all counts are zero)
