# Plan: User Status Management Endpoints

## Context

The current users module has fragmented and inconsistent status management: a toggle-based `PATCH /:id/deactivate`, a `DELETE /:id` soft-delete, and a catch-all `PATCH /:id` admin update that also accepts a `status` field. The spec calls for four explicit, purpose-named status endpoints (activate, deactivate, suspend, delete) with full audit logging, session revocation on suspension, and email notifications. The `userStatusAudit` table already exists in the schema, making audit logging a first-class feature with no schema changes required.

## Implementation Plan

### 1. Zod Schema — `src/zodschemas/users.ts`

Add a new `SetUserStatusSchema`:

- `reason` — optional string (max 500 chars) for audit log

### 2. Repository — `src/modules/users/users.repository.ts`

Add one new method:

- `insertStatusAuditRecord({ userId, changedBy, oldStatus, newStatus, reason?, ipAddress?, userAgent? })` — inserts a row into the existing `userStatusAudit` table (imported from `src/db/index.ts`)

### 3. Email Helpers — `src/utils/helpers.ts`

Add two new template builder functions following the existing pattern:

- `buildSuspensionEmailHtml(firstName: string)` — notifies user their account has been suspended
- `buildDeactivationEmailHtml(firstName: string)` — notifies user their account has been deactivated

### 4. Auth Middleware — `src/middleware/auth.middleware.ts`

After JWT verification, add a Redis check for user-level session revocation:

- Key: `user_sessions_revoked:${userId}`
- Value: Unix timestamp (seconds) of when revocation was issued
- Guard: if key exists AND `payload.iat < revokedAt` → throw `AppError(401, "Session has been revoked")`
- This allows immediate session invalidation for all tokens issued before the suspension time, without schema changes

### 5. Service — `src/modules/users/users.service.ts`

Add one new shared method `setUserStatus()` that all four handlers will call:

```
setUserStatus(requesterId, requesterRole, targetId, newStatus, reason?, ipAddress?, userAgent?)
```

**Guards (in order):**

1. Fetch target user — 404 if not found
2. Self-action guard — 403 if `requesterId === targetId`
3. Role hierarchy — reuse existing `canModifyTarget()` — 403 if unauthorized
4. Already-in-status guard — 409 if `target.status === newStatus`
5. Deleted account guard — 403 if target is already `deleted` (cannot be changed via these endpoints)
6. Last super-admin guard for `inactive`, `suspended`, `deleted` — reuse existing `countByRoleAndStatus()` from repo — 403 if target is the last active super_admin

**Execution:**

1. Update user status via `usersRepo.updateById(targetId, { status: newStatus, updatedBy: requesterId })`
2. Insert audit record via `usersRepo.insertStatusAuditRecord({ userId: targetId, changedBy: requesterId, oldStatus: target.status, newStatus, reason, ipAddress, userAgent })`
3. If `newStatus === 'suspended'`: set Redis key `user_sessions_revoked:${targetId}` = current Unix timestamp (no expiry — or set a very long TTL like 30 days)
4. If `newStatus === 'suspended'` or `newStatus === 'inactive'`: send email notification via `sendEmail()` using the appropriate template builder
5. Return updated user (passwordHash already stripped by `updateById`)

Refactor the existing `deactivateUser()` and `adminDeleteUser()` service methods to delegate to `setUserStatus()` to eliminate duplication.

### 6. Controller — `src/modules/users/users.controller.ts`

Add three new handlers following the existing pattern (validate → call service → return response):

- `activateUserHandler` — calls `setUserStatus(..., 'active', ...)`
- `suspendUserHandler` — calls `setUserStatus(..., 'suspended', ...)`
- `deleteUserStatusHandler` — calls `setUserStatus(..., 'deleted', ...)`

Update `deactivateUserHandler` to call `setUserStatus(..., 'inactive', ...)` instead of the old toggle.

All four handlers extract optional `reason` from `req.body` (validated by `SetUserStatusSchema`), and pass `req.ip` and `req.headers['user-agent']` for the audit log.

### 7. Router — `src/modules/users/users.router.ts`

Add three new routes (all require `authenticate` + `requireRole(ADMIN, SUPER_ADMIN)`):

- `PATCH /:id/activate` → `activateUserHandler`
- `PATCH /:id/suspend` → `suspendUserHandler`
- `PATCH /:id/delete` → `deleteUserStatusHandler`

Update the existing `PATCH /:id/deactivate` to use the updated `deactivateUserHandler`.

**Note:** Keep the existing `DELETE /:id` route pointing to `adminDeleteUserHandler` for backward compatibility, but have it delegate to `setUserStatus()` internally.

**Route ordering:** all named sub-routes (`/me`, `/count`, `/stats`, `/activate`, etc.) must be registered before `/:id`.

### 8. Tests — `tests/user-status-management.test.ts`

Write integration-style tests covering the cases specified in the spec:

- Activate: succeeds for super_admin on inactive user
- Deactivate: succeeds for admin on active citizen
- Suspend: succeeds for super_admin on active user → verify Redis key set
- Delete: succeeds for super_admin on non-super-admin
- 403 when admin targets another admin
- 403 when actor targets themselves
- 404 when target user does not exist
- 409 when target is already in requested status
- Last super-admin guard returns 403

## Critical Files

| File                                    | Change                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| `src/zodschemas/users.ts`               | Add `SetUserStatusSchema`                                        |
| `src/modules/users/users.repository.ts` | Add `insertStatusAuditRecord()`                                  |
| `src/utils/helpers.ts`                  | Add `buildSuspensionEmailHtml()`, `buildDeactivationEmailHtml()` |
| `src/middleware/auth.middleware.ts`     | Add Redis session-revocation check                               |
| `src/modules/users/users.service.ts`    | Add `setUserStatus()`, refactor existing status methods          |
| `src/modules/users/users.controller.ts` | Add 3 handlers, update deactivate handler                        |
| `src/modules/users/users.router.ts`     | Add 3 routes, update deactivate route                            |
| `tests/user-status-management.test.ts`  | New test file                                                    |

## Key Reused Utilities

- `canModifyTarget()` — `src/modules/users/users.service.ts` (role hierarchy enforcement)
- `countByRoleAndStatus()` — `src/modules/users/users.repository.ts` (last super-admin guard)
- `updateById()` — `src/modules/users/users.repository.ts` (status update + password stripping)
- `redisClient` — `src/config/redis.ts` (session revocation key)
- `sendEmail()` — `src/utils/email.ts` (suspension/deactivation notifications)
- `USER_STATUS`, `USER_ROLES` — `src/utils/constants.ts`
- `AppError` — `src/shared/errors/AppError.ts`
- `userStatusAudit` table — already exported from `src/db/index.ts`

## Verification

1. Start dev server: `npm run dev`
2. Use a REST client to hit each of the four endpoints with:
   - Valid admin JWT + citizen target → expect 200
   - Admin JWT + admin target → expect 403
   - Self-targeting → expect 403
   - Nonexistent user ID → expect 404
   - Repeat same status → expect 409
3. After suspending a user, verify the `user_sessions_revoked:${userId}` key exists in Redis
4. Verify suspended user's existing JWT is rejected with 401 on next request
5. Verify email is sent on suspend and deactivate
6. Check `user_status_audit` table for new rows after each status change
7. Run `npm test` (if test runner is configured) to execute the new test file
