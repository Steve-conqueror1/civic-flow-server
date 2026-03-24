# Plan: Admin User Stats Endpoint

## Context

Admins need a quick snapshot of user health across the platform. This endpoint provides four counts — total users, staff, unverified (inactive), and suspended — in a single request, following the existing module structure.

Spec file: `_specs/admin-user-stats.md`

## Field Mapping (spec → actual DB columns)

| Spec field       | DB column / condition                |
| ---------------- | ------------------------------------ |
| `totalUsers`     | `COUNT(*)` on the `users` table      |
| `totalStaff`     | `role IN ('admin', 'super_admin')`   |
| `inactiveUsers`  | `isEmailVerified = false`            |
| `suspendedUsers` | `status = 'suspended'` (status enum) |

No caching — counts must reflect live DB state per spec.

## Implementation Steps

### 1. Repository — `src/modules/users/users.repository.ts`

Add one new method `getUserStats()` that runs a **single query** using conditional aggregation (Drizzle `sql` tagged template) to return all four counts at once:

```sql
SELECT
  COUNT(*)                                                   AS "totalUsers",
  COUNT(*) FILTER (WHERE role IN ('admin','super_admin'))    AS "totalStaff",
  COUNT(*) FILTER (WHERE "isEmailVerified" = false)          AS "inactiveUsers",
  COUNT(*) FILTER (WHERE status = 'suspended')               AS "suspendedUsers"
FROM users;
```

Return type: `{ totalUsers: number; totalStaff: number; inactiveUsers: number; suspendedUsers: number }`.

Reuse: `db` from `src/config/index.ts`; import `sql` from `drizzle-orm` and `users` table from the module schema.

### 2. Service — `src/modules/users/users.service.ts`

Add `getUserStats()` that calls `usersRepo.getUserStats()` and returns the result directly (no caching per spec).

### 3. Controller — `src/modules/users/users.controller.ts`

Add `getUserStatsHandler`:

- No request body or query params to validate.
- Calls `usersService.getUserStats()`.
- Returns `200` with `{ success: true, data: { totalUsers, totalStaff, inactiveUsers, suspendedUsers } }`.
- Wraps in try/catch with `next(err)`.

### 4. Router — `src/modules/users/users.router.ts`

Add route **before** any parameterized routes (e.g. `/:id`) to avoid shadowing:

```
GET /stats  →  authenticate, requireRole(ADMIN, SUPER_ADMIN), getUserStatsHandler
```

Full path: `GET /api/v1/admin/users/stats`.

## Critical Files

| File                                    | Change                      |
| --------------------------------------- | --------------------------- |
| `src/modules/users/users.repository.ts` | Add `getUserStats()`        |
| `src/modules/users/users.service.ts`    | Add `getUserStats()`        |
| `src/modules/users/users.controller.ts` | Add `getUserStatsHandler`   |
| `src/modules/users/users.router.ts`     | Register `GET /stats` route |

No schema changes. No new Zod schema needed. No `src/db/index.ts` changes.

## Verification

1. `npm run dev`
2. Authenticate as admin → `GET /api/v1/admin/users/stats` → expect 200 with four numeric fields.
3. No token → expect 401.
4. `citizen` role → expect 403.
5. Run tests in `tests/` covering the five cases from the spec's Testing Guidelines.
