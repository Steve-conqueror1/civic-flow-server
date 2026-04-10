# Spec for Geocode Endpoint

branch: claude/api-feat/geocode-endpoint

## Summary

Add a geocoding API endpoint that accepts a search query string and returns location results from the Mapbox Geocoding API. This allows clients to resolve place names or addresses into structured location data (coordinates, place names, etc.). The `MAPBOX_TOKEN` env var is already registered in the Zod env schema.

## Functional Requirements

- Expose a `GET /api/geocode` endpoint that accepts a required `q` query parameter (e.g. `/api/geocode?q=edmonton`)
- Forward the query to the Mapbox Geocoding API using the `MAPBOX_TOKEN` from env
- Return a simplified, client-friendly array of location results from the Mapbox response
- Each result should include at minimum: place name, coordinates (longitude, latitude), and place type
- The endpoint should be accessible to authenticated users only
- Validate that the `q` query parameter is present and non-empty; return a 400 if missing or blank
- Return a 502 or appropriate error if the Mapbox API call fails

## Possible Edge Cases

- Empty or whitespace-only `q` parameter
- Mapbox API returns zero results — return an empty array, not an error
- Mapbox API is unreachable or returns a non-200 response — surface a clean error to the client
- `q` contains special characters or non-ASCII input (e.g. accented characters, non-Latin scripts) — these should be URL-encoded before forwarding
- Extremely long query strings — consider a max length validation

## Acceptance Criteria

- `GET /api/geocode?q=edmonton` returns a 200 with an array of location results
- `GET /api/geocode` (missing `q`) returns a 400 with a descriptive error message
- `GET /api/geocode?q=` (empty `q`) returns a 400
- Unauthenticated requests return a 401
- A Mapbox API failure results in a non-200 error response with a meaningful message
- Zero results from Mapbox returns a 200 with an empty array

## Open Questions

- Should results be limited to a specific country or region by default, or global? Canada
- Should the number of results returned be configurable via a query param (e.g. `limit`)? yes
- Should results be cached (e.g. in Redis) to reduce Mapbox API usage for repeated queries? yes
- Is there a rate-limiting concern for this endpoint given it proxies to a paid API? no for now

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Returns 200 with location results for a valid query
- Returns 400 when `q` is missing
- Returns 400 when `q` is an empty string
- Returns 401 for unauthenticated requests
- Returns an empty array when Mapbox returns no results
- Handles Mapbox API failure gracefully with an appropriate error status
