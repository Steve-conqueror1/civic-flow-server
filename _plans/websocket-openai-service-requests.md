# Plan: WebSocket and OpenAI Integration for Service Requests

## Context

The featured case system is partially built: `getFeaturedCase()` selects a case via OpenAI and a BullMQ worker broadcasts it over Socket.IO every 2 minutes. What's missing is:

- A REST endpoint so clients can fetch the current featured case on page load (before the first WebSocket push).
- Redis caching so `getFeaturedCase()` doesn't call OpenAI on every REST request.
- A revised prompt that avoids naming specific civic issue categories, so selection is more diverse.

The spec also resolved open questions: cache the result in Redis (TTL = 120 s, matching the queue interval), use `gpt-5-nano`, and emit the full case object over WebSocket.

---

## Files to Modify

| File                                                 | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `src/modules/serviceRequests/requests.service.ts`    | Add Redis cache-aside to `getFeaturedCase()`; rewrite prompt |
| `src/modules/serviceRequests/requests.controller.ts` | Add `getFeaturedCaseHandler`                                 |
| `src/modules/serviceRequests/requests.router.ts`     | Add `GET /featured` (public, static, before `/:id`)          |
| `src/tests/featuredCase.test.ts` _(new)_             | Vitest + supertest tests                                     |

---

## Implementation Steps

### 1. Revise the OpenAI prompt in `getFeaturedCase()` (`requests.service.ts`)

Replace the current prompt with one that:

- Does **not** mention specific issue categories (e.g. no "potholes", "graffiti", "repairs").
- Guides selection by: civic impact, community visibility, status variety, urgency signals, and overall representativeness across the current batch.
- Keeps the same output contract: return **only** the ID of the selected case.

### 2. Add Redis cache-aside to `getFeaturedCase()` (`requests.service.ts`)

Reuse the existing `redisClient` (imported from `src/config/redis.ts`) following the same pattern used in `src/modules/users/users.service.ts`:

```
CACHE_KEY = "service_requests:featured_case"
TTL = 120  (seconds — matches 2-minute BullMQ interval)

1. Try redisClient.get(CACHE_KEY)
2. If hit → JSON.parse and return
3. If miss → run existing OpenAI selection logic → JSON.stringify and redisClient.set with EX: 120 → return result
```

The worker calls `getFeaturedCase()` every 2 minutes. When it fires, the cache has just expired, so OpenAI is called and the fresh result is cached. REST calls within the window get the cached value.

### 3. Add `getFeaturedCaseHandler` to `requests.controller.ts`

Simple handler:

- Calls `getFeaturedCase()` from the service.
- Returns `{ success: true, data: featuredCase }` on success (or `data: null` when no cases exist).
- Lets `AppError` bubble to global error middleware.
- No request validation needed (no body or query params).

### 4. Register the route in `requests.router.ts`

Add as a **static path** (before `/:id`) so it is not swallowed by the param matcher:

```
GET /featured  →  getFeaturedCaseHandler  (no auth middleware)
```

Add the corresponding `@openapi` JSDoc block for Scalar docs consistency.

### 5. Write tests in `src/tests/featuredCase.test.ts`

Follow the exact patterns in `src/tests/serviceRequests.test.ts`:

- `vi.mock()` at the top for env, Redis, db, S3, and the AI config.
- Mock `requests.service` methods with `vi.mocked()`.
- Use supertest against the Express `app`.

**Test cases:**

1. `GET /api/v1/service-requests/featured` — returns `200` with a case object when `getFeaturedCase` resolves a case.
2. `GET /api/v1/service-requests/featured` — returns `200` with `data: null` when `getFeaturedCase` resolves `null`.
3. `GET /api/v1/service-requests/featured` — no auth token required (unauthenticated request succeeds).
4. `getFeaturedCase()` unit: falls back to `recentCases[0]` when OpenAI returns an unrecognised ID (mock `requestRepo.getRecentCases` and `generateText`).
5. `getFeaturedCase()` unit: returns cached value without calling OpenAI when Redis cache hit (mock `redisClient.get` to return a cached JSON string).

---

## Verification

1. Run `npm run dev` — server starts, worker initialises, queue schedules repeatable job.
2. Hit `GET /api/v1/service-requests/featured` unauthenticated → expect `200` with a case or `null`.
3. Check Redis: `redis-cli GET service_requests:featured_case` → should contain JSON after first request.
4. Wait ~2 minutes → worker fires, emits `new_featured_case` via Socket.IO, cache refreshes.
5. Run `npm test` → all tests in `featuredCase.test.ts` pass.
