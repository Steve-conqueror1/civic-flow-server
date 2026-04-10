# Plan: Geocode Endpoint

## Context

CivicFlow needs a geocoding proxy endpoint so clients can resolve place names/addresses into coordinates. Rather than exposing the Mapbox token to the frontend, the server proxies the call, enforces auth, and caches results in Redis to avoid redundant paid API calls. `MAPBOX_TOKEN` is already registered in the Zod env schema.

---

## Files to Create

| File                                        | Purpose                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| `src/modules/geocode/geocode.router.ts`     | Route definition — `GET /` with `authenticate`           |
| `src/modules/geocode/geocode.controller.ts` | Validate query params, call service, return response     |
| `src/modules/geocode/geocode.service.ts`    | Cache check → Mapbox call → cache write → return results |
| `src/modules/geocode/index.ts`              | Public export surface                                    |
| `src/zodschemas/geocode.ts`                 | Zod schema for query params + inferred types             |

## Files to Modify

| File         | Change                                                |
| ------------ | ----------------------------------------------------- |
| `src/app.ts` | Import `geocodeRouter` and mount at `/api/v1/geocode` |

> No repository or schema file needed — this module has no database table.

---

## Implementation Steps

### 1. Zod Schema — `src/zodschemas/geocode.ts`

Define a query params schema:

- `q`: `z.string().min(1)` — required, non-empty search string
- `limit`: `z.coerce.number().int().min(1).max(10).default(5)` — optional, defaults to 5

Export the schema and its inferred type `GeocodeQuery`.

---

### 2. Service — `src/modules/geocode/geocode.service.ts`

Function: `geocodeQuery(q: string, limit: number): Promise<GeocodeResult[]>`

Logic:

1. Build a Redis cache key: `geocode:CA:${q.toLowerCase()}:${limit}`
2. Check Redis — if hit, parse and return cached JSON
3. Call Mapbox Geocoding API via `axios.get(...)` with:
   - URL: `https://api.mapbox.com/geocoding/v5/mapbox.places/{encodedQ}.json`
   - Params: `country=CA`, `limit`, `access_token=env.MAPBOX_TOKEN`
   - Timeout: `5000ms`
4. If Mapbox returns non-2xx or throws, throw `new AppError(502, "Geocoding service unavailable.")`
5. Map Mapbox `features` array to simplified shape:
   ```
   { placeName, longitude, latitude, placeType }
   ```
6. Store result JSON in Redis with TTL of `86400` seconds (24 h)
7. Return the mapped array (empty array if no features)

Import: `axios` (already installed), `env` from `../../config`, `redisClient` from `../../config/redis`, `AppError` from `../../shared/errors/AppError`.

---

### 3. Controller — `src/modules/geocode/geocode.controller.ts`

Handler: `geocodeHandler`

- Parse `req.query` with `GeocodeQuerySchema.safeParse()`
- On failure → `400` with `errors: parsed.error.flatten().fieldErrors`
- On success → call `geocodeService.geocodeQuery(q, limit)`
- Return `200` with `{ success: true, data: { results } }`
- Wrap in try/catch, pass errors to `next`

---

### 4. Router — `src/modules/geocode/geocode.router.ts`

```
GET /  →  authenticate  →  geocodeHandler
```

No role restriction — any authenticated user can geocode.

---

### 5. Module Index — `src/modules/geocode/index.ts`

Export `geocodeRouter` as default.

---

### 6. Mount in `src/app.ts`

Add import and mount alongside existing routers:

```
app.use("/api/v1/geocode", geocodeRouter);
```

---

## Verification

1. Start the dev server: `npm run dev`
2. Authenticate to get an `access_token` cookie
3. Test valid query:
   ```
   GET /api/v1/geocode?q=edmonton
   ```
   → 200 with array of Canadian location results
4. Test with limit:
   ```
   GET /api/v1/geocode?q=toronto&limit=3
   ```
   → 200 with max 3 results
5. Test missing `q` → 400
6. Test empty `q=` → 400
7. Test unauthenticated → 401
8. Second call with same query → served from Redis cache (verify via logs or Redis CLI)
