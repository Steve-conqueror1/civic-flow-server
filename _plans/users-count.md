# Plan: Users Count Endpoint

## Context

The platform needs a public-facing `GET /api/v1/users/count` endpoint to display the number of registered citizens (e.g., on a landing page stats widget). Per the spec, the count must be scoped to `role = 'citizen'` and `status = 'active'` only (excluding deleted/suspended/inactive users), and Redis caching is required to reduce repeated DB hits.

---

## Critical Files

| File                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `src/modules/users/users.service.ts`    | Add `getActiveCitizenCount()` with Redis cache-aside |
| `src/modules/users/users.controller.ts` | Add `getActiveCitizenCountHandler`                   |
| `src/modules/users/users.router.ts`     | Register `GET /count` (public, no auth)              |
| `tests/users-count.test.ts`             | New test file (create `tests/` directory)            |

> **No repository change needed.** `countByRoleAndStatus(role, status)` already exists at `users.repository.ts:99` and does exactly what we need.

---

## Implementation Steps

### 1. Service — `src/modules/users/users.service.ts`

Add exported async function `getActiveCitizenCount(): Promise<number>`:

1. Define cache key inline: `const CACHE_KEY = "users:citizen_active_count"`.
2. Try `redisClient.get(CACHE_KEY)` — if not null, return `parseInt(cached, 10)` immediately.
3. On cache miss, call `await usersRepo.countByRoleAndStatus(USER_ROLES.CITIZEN, USER_STATUS.ACTIVE)`.
4. Store result: `await redisClient.set(CACHE_KEY, String(n), { EX: 60 })`.
5. Return the count.

`redisClient`, `USER_ROLES`, and `USER_STATUS` are already imported in this file.

### 2. Controller — `src/modules/users/users.controller.ts`

Add exported async function `getActiveCitizenCountHandler(req, res, next)`:

1. Wrap in try/catch, forwarding errors to `next(err)`.
2. Call `await usersService.getActiveCitizenCount()`.
3. Respond: `res.status(200).json({ success: true, count })`.

Note: Response uses a flat shape `{ success, count }` (no `data` envelope), since `count` is a scalar metric, not a resource.

### 3. Router — `src/modules/users/users.router.ts`

Add `getActiveCitizenCountHandler` to the named imports from `./users.controller`.

Register the route **in the static-paths section, after the `/me` routes and before the `/:id` catch-all at line 34**:

```
router.get("/count", getActiveCitizenCountHandler);
```

No `authenticate` or `requireRole` middleware — the endpoint is public.

---

## Tests — `tests/users-count.test.ts`

Create the `tests/` directory at the project root. Use Vitest + Supertest. Mock the users service with `vi.mock`.

Test cases:

1. **Cache hit** — mock service to return `42`; assert `200`, `{ success: true, count: 42 }`.
2. **Cache miss / DB call** — mock service to return `150`; assert `200`, `{ success: true, count: 150 }`.
3. **Zero count** — mock service to return `0`; assert `200`, `{ success: true, count: 0 }` (verifies `0` is not treated as falsy).
4. **No auth required** — send request with no cookies or Authorization header; assert `200`.
5. **No PII in response** — assert response body contains no user fields (`email`, `id`, `firstName`, etc.).

---

## Verification

1. Run dev server: `npm run dev`
2. `curl http://localhost:5002/api/v1/users/count` — expect `{ "success": true, "count": <n> }` with no auth header.
3. Call twice within 60s — verify Redis is hit (second response is instant / DB not queried).
4. Run tests: `npm run test` (or `npx vitest tests/users-count.test.ts`).
