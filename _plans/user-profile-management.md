# Plan: User Profile Management API

## Context

The platform needs a users module so citizens can self-manage their profiles and admins/super_admins can administer user accounts. The spec also revealed a latent bug in `auth.service.ts` where `user.isActive` is referenced but the field does not exist — the schema uses a `status` enum (`active | inactive | suspended | deleted`). This bug must be fixed as part of this feature.

---

## Bug Fix First

**File:** `src/modules/auth/auth.service.ts`

- Line 138: `if (!user.isActive)` → `if (user.status !== "active")`
- Line 210: `if (!user || !user.isActive)` → `if (!user || user.status !== "active")`

---

## New Files to Create

### 1. `src/zodschemas/users.ts`

Validation schemas:

- `updateMeSchema` — citizen self-edit: `firstName`, `lastName`, `phoneNumber`, `address`, `mfaEnabled` (all optional)
- `adminUpdateUserSchema` — admin edit of citizen (same fields + optional `role`, `status`, `email`)
- `superAdminUpdateUserSchema` — same as admin update (shared schema; role restriction enforced in service layer)
- `listUsersQuerySchema` — query params: `page`, `limit`, `role`, `status`, `search` (all optional)

---

### 2. `src/modules/users/users.repository.ts`

Exports `UserRow` (re-use from `src/types/user.ts`) and the following DB functions:

| Function                     | Purpose                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `findById(id)`               | Find user by ID; returns `UserRow \| undefined`                                      |
| `findAll(filters)`           | Paginated list; accepts role, status, search, page, limit; returns `{ rows, total }` |
| `updateById(id, data)`       | Partial update of user fields; returns updated `SafeUser`                            |
| `softDeleteById(id)`         | Sets `status = 'deleted'`; returns void                                              |
| `countByRole(role, status?)` | Count users of a given role (used for last-super_admin guard)                        |

All queries use the shared `db` Drizzle instance from `src/config`.

---

### 3. `src/modules/users/users.service.ts`

Business logic functions:

**Self-service:**

- `getMe(userId)` — find by ID, throw 404 if missing
- `updateMe(userId, data)` — update allowed fields; if `email` is changed → set `isEmailVerified = false` and send verification email via `sendEmail` + store Redis token (reuse existing email verify flow from auth module)
- `deleteMe(userId)` — guard: if user is last active super_admin → throw 403; else soft-delete

**Admin:**

- `listUsers(filters)` — delegates to repo; no role restriction on what can be listed (admin can see all)
- `getUserById(requesterId, requesterRole, targetId)` — find user; return for any role
- `adminUpdateUser(requesterId, requesterRole, targetId, data)`:
  - Load target user; if not found → 404
  - If `requesterRole === "admin"` and `target.role !== "citizen"` → 403
  - If `requesterRole === "super_admin"` and `target.role === "super_admin"` → 403 (cannot modify other super_admins)
  - If `data.email` changes → invalidate email verification (set `isEmailVerified = false`, send email)
  - Populate `updatedBy = requesterId` for basic audit trail
  - Call `updateById`
- `deactivateUser(requesterId, requesterRole, targetId)`:
  - Load target; if not found → 404
  - If `requesterRole === "admin"` and `target.role !== "citizen"` → 403
  - If `requesterRole === "super_admin"` and `target.role === "super_admin"` and `targetId !== requesterId` → 403
  - Toggle: if `target.status === "inactive"` → set `active` (re-activate); else → set `inactive`
- `adminDeleteUser(requesterId, requesterRole, targetId)`:
  - Load target; if not found → 404
  - If `requesterRole === "admin"` and `target.role !== "citizen"` → 403
  - If `requesterRole === "super_admin"` and `target.role === "super_admin"` → 403
  - Guard: if target is last active super_admin → 403
  - Soft-delete via `softDeleteById`

---

### 4. `src/modules/users/users.controller.ts`

One handler per endpoint. Pattern: validate with Zod → call service → return `{ success, message, data }`.

| Handler           | Calls                          |
| ----------------- | ------------------------------ |
| `getMe`           | `usersService.getMe`           |
| `updateMe`        | `usersService.updateMe`        |
| `deleteMe`        | `usersService.deleteMe`        |
| `listUsers`       | `usersService.listUsers`       |
| `getUserById`     | `usersService.getUserById`     |
| `adminUpdateUser` | `usersService.adminUpdateUser` |
| `deactivateUser`  | `usersService.deactivateUser`  |
| `adminDeleteUser` | `usersService.adminDeleteUser` |

`passwordHash` is never returned — use `SafeUser` type or explicitly omit.

---

### 5. `src/modules/users/users.router.ts`

```
GET    /me                      authenticate
PATCH  /me                      authenticate
DELETE /me                      authenticate

GET    /                        authenticate, requireRole("admin","super_admin")
GET    /:id                     authenticate, requireRole("admin","super_admin")
PATCH  /:id                     authenticate, requireRole("admin","super_admin")
PATCH  /:id/deactivate          authenticate, requireRole("admin","super_admin")
DELETE /:id                     authenticate, requireRole("admin","super_admin")
```

Static `/me` routes must be declared **before** `/:id` to prevent Express matching "me" as a UUID param.

---

### 6. `src/modules/users/index.ts`

Export `usersRouter` for mounting in `app.ts`.

---

## Files to Modify

### `src/app.ts`

Add import and mount:

```ts
import { usersRouter } from "./modules/users";
app.use("/api/v1/users", usersRouter);
```

### `src/modules/auth/auth.service.ts`

Fix the two `user.isActive` references (lines 138, 210) → `user.status !== "active"` / `user.status === "active"`.

---

## Key Reuse Points

- `authenticate` middleware: `src/middleware/auth.middleware.ts`
- `requireRole` middleware: `src/middleware/rabc.middleware.ts`
- `AppError`: `src/shared/errors/AppError.ts`
- `SafeUser`, `UserRow` types: `src/types/user.ts`
- `db` instance: `src/config/index.ts`
- `sendEmail`, `buildVerificationEmailHtml`, `stripPasswordHash`: `src/utils/helpers.ts` + `src/utils/email.ts`
- `redisClient`: `src/config/redis.ts` (for email verify token)

---

## Audit Trail

The `users` table already has `updatedBy: uuid` column. Admin update and deactivate operations set `updatedBy = requesterId` — no new table needed.

---

## Verification

1. Run `npm run dev` — server should start without TypeScript errors
2. Test auth bug fix: deactivated user (`status = "inactive"`) should receive 403 on login
3. `GET /api/v1/users/me` — returns own profile without `passwordHash`
4. `PATCH /api/v1/users/me` — updates allowed fields; email change triggers re-verification
5. Admin list: `GET /api/v1/users?role=citizen&page=1&limit=10` — paginated
6. Admin editing another admin as admin role → 403
7. Super_admin editing an admin → succeeds
8. Deactivate last super_admin → 403
9. Run any existing tests: `npm test` (if test runner configured)
