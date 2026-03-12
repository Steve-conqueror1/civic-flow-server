# Spec for WebSocket and OpenAI Integration for Service Requests

branch: claude/api-feat/websocket-openai-service-requests

## Summary

This feature completes the real-time WebSocket infrastructure and OpenAI-powered featured case selection for the service requests module. The core pieces are partially in place: `getFeaturedCase()` in `requests.service.ts` calls OpenAI via the Vercel AI SDK, a BullMQ queue (`featured-case-updates`) fires every 2 minutes, a worker selects the featured case and broadcasts it over Socket.IO, and `socket.ts` initialises the Socket.IO server. What remains is to:

1. Expose a REST endpoint so clients can fetch the current featured case on page load (without waiting for a WebSocket push).
2. Improve the OpenAI selection prompt to be less specific about issue types, so the model makes more diverse, nuanced selections across any kind of civic request.
3. Wire up any missing pieces in the controller/router so the full flow (REST + WebSocket) is accessible to consumers.

## Functional Requirements

- A public (unauthenticated) `GET /api/v1/service-requests/featured` endpoint must return the currently featured service request.
- The featured case is selected by OpenAI from the most recent cases stored in the database. The selection must vary meaningfully across calls rather than always picking the same category of issue.
- The OpenAI prompt must be general enough to work with any type of civic request — it should not name specific issue types (e.g., "potholes", "graffiti") in its criteria. Selection guidance should be expressed in terms of civic impact, urgency signals, status variety, and community interest rather than by subject matter.
- The BullMQ worker must continue to run on a recurring schedule (current: every 2 minutes), re-select the featured case, and broadcast the result via the `new_featured_case` Socket.IO event.
- The Socket.IO server must broadcast to all connected clients when a new featured case is selected by the worker.
- The REST endpoint should serve the same selection logic as the worker so page-load and push payloads are consistent.
- The response shape for the featured case must include at minimum: `id`, `title`, `description`, `status`, `aiSummary`, `location`, and timestamps.

## Possible edge cases (only if referenced)

- No cases in the database: the endpoint and the worker must handle an empty result gracefully (return `null` / emit nothing rather than crashing).
- OpenAI returns an ID that does not match any case in the result set: fall back to the first case in the list, as already coded.
- OpenAI call fails or times out: surface an appropriate error from the endpoint; the worker should log the failure without crashing the process.
- The Socket.IO server has not yet been initialised when the worker fires (race condition on startup): the `getIO()` guard already throws — ensure the worker startup order is safe.

## Acceptance Criteria

- `GET /api/v1/service-requests/featured` returns `200` with a featured case object when cases exist, and `200` with `{ data: null }` when no cases exist.
- The endpoint is accessible without an auth token.
- The OpenAI prompt does not reference specific civic issue categories by name.
- Calling the endpoint multiple times over a period returns varied case selections (not always the same record for different sets of recent cases).
- The BullMQ worker successfully emits `new_featured_case` on the Socket.IO server after selecting a case.
- Worker failures are logged and do not terminate the process.
- The controller for the featured case endpoint delegates entirely to the existing `getFeaturedCase()` service function.

## Open Questions

- Should the featured case be cached in Redis between BullMQ runs so the REST endpoint does not call OpenAI on every request? If so, what TTL aligns with the 2-minute queue interval? yes
- Should the `featured` endpoint be rate-limited to protect OpenAI quota, or will the cache strategy above be sufficient? no
- Is the `gpt-5-nano` model identifier in the service intentional or a placeholder? Confirm the correct model name before shipping. use `gpt-5-nano` model
- Should the Socket.IO `new_featured_case` event carry the full case object or just the ID (leaving the client to fetch details via REST)? full case object

## Testing Guidelines

Create a test file in the `./tests` folder (e.g., `featuredCase.test.ts`) with meaningful coverage for the following cases, without going too heavy:

- `GET /api/v1/service-requests/featured` returns a valid case object when recent cases exist (mock OpenAI and the repository).
- `GET /api/v1/service-requests/featured` returns `null`/empty when no cases exist.
- `getFeaturedCase()` falls back to the first case when OpenAI returns an unrecognised ID.
- `getFeaturedCase()` throws or returns null gracefully when OpenAI call fails.
- The worker calls `getFeaturedCase()` and emits `new_featured_case` with the result (mock the Socket.IO instance and the service).
